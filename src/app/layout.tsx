import type { Metadata, Viewport } from "next";
import { ShareProviders } from "@/components/share/ShareProviders";
import {
  APP_DESCRIPTION,
  APP_ICON_PATH,
  APP_LOGO_PATH,
  APP_NAME,
  PWA_BACKGROUND_COLOR,
  PWA_THEME_COLOR,
} from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: APP_ICON_PATH, sizes: "512x512", type: "image/png" },
      { url: "/icons/fastcourt-logo.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: APP_ICON_PATH, sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "black-translucent",
    startupImage: APP_ICON_PATH,
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    google: "notranslate",
  },
};

export const viewport: Viewport = {
  themeColor: PWA_THEME_COLOR,
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      translate="no"
      className="notranslate h-full antialiased"
      style={{ backgroundColor: PWA_BACKGROUND_COLOR }}
    >
      <head>
        <link rel="preload" href={APP_LOGO_PATH} as="image" fetchPriority="high" />
      </head>
      <body className="notranslate min-h-full flex flex-col">
        <ShareProviders>{children}</ShareProviders>
      </body>
    </html>
  );
}
