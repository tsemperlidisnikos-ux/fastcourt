export type YouTubePlayerState = -1 | 0 | 1 | 2 | 3 | 5;

export interface YouTubePlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => YouTubePlayerState;
  destroy: () => void;
}

type YouTubePlayerCtor = new (
  element: HTMLElement | string,
  options: {
    videoId: string;
    playerVars?: Record<string, string | number>;
    events?: {
      onReady?: (event: { target: YouTubePlayerInstance }) => void;
      onStateChange?: (event: {
        data: YouTubePlayerState;
        target: YouTubePlayerInstance;
      }) => void;
    };
  },
) => YouTubePlayerInstance;

declare global {
  interface Window {
    YT?: {
      Player: YouTubePlayerCtor;
      loaded?: number;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;

export function loadYouTubeIframeApi(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube API requires a browser."));
  }
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-fc-youtube-api="1"]',
    );
    if (existing) {
      const wait = () => {
        if (window.YT?.Player) resolve();
        else window.setTimeout(wait, 40);
      };
      wait();
      return;
    }

    const prior = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prior?.();
      resolve();
    };

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.dataset.fcYoutubeApi = "1";
    script.onerror = () => reject(new Error("Failed to load YouTube API."));
    document.head.appendChild(script);
  });

  return apiPromise;
}

export function createYouTubePlayer(
  host: HTMLElement,
  videoId: string,
  onReady: (player: YouTubePlayerInstance) => void,
  onStateChange?: (state: YouTubePlayerState) => void,
) {
  return loadYouTubeIframeApi().then(() => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const player = new window.YT!.Player(host, {
      videoId,
      playerVars: {
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        enablejsapi: 1,
        origin,
      },
      events: {
        onReady: (event) => onReady(event.target),
        onStateChange: (event) => onStateChange?.(event.data),
      },
    });
    return player;
  });
}
