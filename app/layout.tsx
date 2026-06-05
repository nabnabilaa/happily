import type { Metadata, Viewport } from "next";
import { Nunito, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Shell from "@/components/layout/Shell";
import PWARegistration from "@/components/pwa/PWARegistration";
import InstallButton from "@/components/pwa/InstallButton";
import OfflineToast from "@/components/pwa/OfflineToast";
import { HPProvider } from "@/lib/HPContext";
import Script from "next/script";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--hp-font",
});

const nunitoDisplay = Nunito({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  variable: "--hp-font-display",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--hp-font-mono",
});

export const viewport: Viewport = {
  themeColor: "#04050a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Bee Flow",
  description: "Flow into Focus — Human-Centered Platform",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bee Flow",
  },
  formatDetection: {
    telephone: false,
  },
};

import SWRProvider from "@/components/SWRProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${nunito.variable} ${nunitoDisplay.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <head>
      </head>
      <body>
        <Script id="theme-loader" strategy="beforeInteractive" dangerouslySetInnerHTML={{
          __html: `
            try {
              var saved = localStorage.getItem('hp-theme');
              var system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
              var theme = saved || system;
              if (theme === 'dark') {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
            } catch (e) {}
          `
        }} />
        <Script id="gsi-error-suppressor" strategy="beforeInteractive" dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var originalError = console.error;
                console.error = function() {
                  var args = Array.prototype.slice.call(arguments);
                  var isGsiAbortError = args.some(function(arg) {
                    var str = '';
                    if (arg instanceof Error) {
                      str = arg.message + ' ' + arg.stack;
                    } else if (arg && typeof arg === 'object') {
                      try { str = JSON.stringify(arg); } catch(e) { str = String(arg); }
                    } else {
                      str = String(arg || '');
                    }
                    return str.indexOf('[GSI_LOGGER]') !== -1 || str.indexOf('AbortError') !== -1 || str.indexOf('FedCM') !== -1;
                  });
                  
                  if (isGsiAbortError) {
                    return;
                  }
                  originalError.apply(console, arguments);
                };

                window.addEventListener('unhandledrejection', function(event) {
                  var reason = event.reason;
                  var msg = '';
                  if (reason instanceof Error) {
                    msg = reason.message;
                  } else if (reason && typeof reason === 'object') {
                    msg = reason.message || String(reason);
                  } else {
                    msg = String(reason || '');
                  }
                  if (msg.indexOf('[GSI_LOGGER]') !== -1 || msg.indexOf('AbortError') !== -1 || msg.indexOf('FedCM') !== -1) {
                    event.preventDefault();
                    event.stopPropagation();
                  }
                });

                window.addEventListener('error', function(event) {
                  var msg = event.message || '';
                  if (msg.indexOf('[GSI_LOGGER]') !== -1 || msg.indexOf('AbortError') !== -1 || msg.indexOf('FedCM') !== -1) {
                    event.preventDefault();
                    event.stopPropagation();
                  }
                }, true);
              } catch(e) {}
            })();
          `
        }} />
        <SWRProvider>
          <HPProvider>
            <PWARegistration />
            <InstallButton />
            <OfflineToast />
            <Shell>{children}</Shell>
          </HPProvider>
        </SWRProvider>
      </body>
    </html>
  );
}
