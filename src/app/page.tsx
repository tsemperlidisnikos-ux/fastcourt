import type { Metadata } from "next";
import { LandingHeroLogo } from "@/components/landing/LandingHeroLogo";
import { LandingScreen } from "@/components/landing/LandingScreen";
import { APP_DESCRIPTION, APP_LOGO_PATH, APP_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: `${APP_NAME} — Basketball play designer for coaches`,
  description: APP_DESCRIPTION,
  openGraph: {
    title: `${APP_NAME} — Basketball play designer for coaches`,
    description: APP_DESCRIPTION,
    type: "website",
  },
};

export default function HomePage() {
  return (
    <>
      <link rel="preload" as="image" href={APP_LOGO_PATH} fetchPriority="high" />
      <LandingScreen heroLogo={<LandingHeroLogo />} />
    </>
  );
}
