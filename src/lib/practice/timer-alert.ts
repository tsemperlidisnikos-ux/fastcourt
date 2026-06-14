/** Short gym timer alert when a practice block ends. */
export function playPracticeTimerAlert() {
  if (typeof window === "undefined") return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.12;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.28);
    window.setTimeout(() => void ctx.close(), 400);
  } catch {
    /* ignore — audio may be blocked until user gesture */
  }
}
