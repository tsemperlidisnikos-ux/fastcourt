import Link from "next/link";
import { APP_LOGO_PATH, APP_NAME } from "@/lib/config";
import { APP_LOGO_STORAGE_KEY } from "@/lib/settings/app-logo";

/** Server-rendered hero logo — visible in first HTML paint, before React hydrates. */
export function LandingHeroLogo() {
  const bootScript = `(function(){try{var v=localStorage.getItem(${JSON.stringify(APP_LOGO_STORAGE_KEY)});var el=document.getElementById("fc-landing-hero-logo");if(v&&el)el.src=v;}catch(e){}})();`;

  return (
    <>
      <Link href="/" className="fc-landing-hero-logo" aria-label={`${APP_NAME} home`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          id="fc-landing-hero-logo"
          src={APP_LOGO_PATH}
          alt=""
          width={440}
          height={120}
          decoding="sync"
          fetchPriority="high"
          loading="eager"
          suppressHydrationWarning
        />
      </Link>
      <script dangerouslySetInnerHTML={{ __html: bootScript }} />
    </>
  );
}
