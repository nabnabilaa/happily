import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import Shell from "@/components/layout/Shell";
import PWARegistration from "@/components/pwa/PWARegistration";

import OfflineToast from "@/components/pwa/OfflineToast";
import { HPProvider } from "@/lib/HPContext";
import Script from "next/script";
import GlobalClickInterceptor from "@/components/ui/GlobalClickInterceptor";

// Manrope is the UI face. Loaded as a variable font so the type scale can use
// intermediate weights (450 body, 650 headings) instead of jumping 400 → 700.
const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

export const viewport: Viewport = {
  // Browser chrome (address bar, task switcher) is painted by the OS, which
  // never sees our stylesheet — these must be literal and must be kept in step
  // with --hp-paper in globals.css by hand.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F5F7" }, // design-ok: OS chrome, no CSS vars
    { media: "(prefers-color-scheme: dark)", color: "#0E1116" },  // design-ok: OS chrome, no CSS vars
  ],
  width: "device-width",
  initialScale: 1,
  // Pinch-zoom left enabled: disabling it fails WCAG 1.4.4 and blocks users
  // who need to magnify.
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Flowbuddy by Maxy",
  description: "Human-Centered Productivity Platform",
  // `app/manifest.ts` disajikan Next di /manifest.webmanifest, bukan
  // /manifest.json — alamat lama menghasilkan 404 dan browser diam saja
  // soal itu, jadi PWA-nya tidak pernah punya manifest sama sekali.
  manifest: "/manifest.webmanifest",
  // Ikon disebut eksplisit supaya tidak bergantung pada penemuan otomatis:
  // yang terlihat di tab adalah logogram Maxy, bukan favicon bawaan Next.
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/maxy-icon-180.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Flowbuddy by Maxy",
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
    <html 
      lang="id" 
      className={manrope.variable}
      
      suppressHydrationWarning
    >
      <head>
      </head>
      <body>
        <Script id="theme-loader" strategy="beforeInteractive" dangerouslySetInnerHTML={{
          __html: `
            try {
              var saved = localStorage.getItem('hp-theme');
              // Fall back to the OS preference when the user hasn't chosen.
              var theme = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
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
            <GlobalClickInterceptor />
            <PWARegistration />

            <OfflineToast />
            <Shell>{children}</Shell>
          </HPProvider>
        </SWRProvider>
      </body>
    </html>
  );
}
