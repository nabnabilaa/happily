import type { Metadata, Viewport } from "next";
import { Nunito, Manrope, Inter, Baloo_2, Fredoka, Poppins } from "next/font/google";
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

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const nunito = Nunito({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-nunito",
});

const baloo2 = Baloo_2({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-baloo2",
});

const fredoka = Fredoka({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fredoka",
});

// Poppins has no variable cut on Google Fonts — static weights only.
const poppins = Poppins({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
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
  manifest: "/manifest.json",
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
      className={`${nunito.variable} ${manrope.variable} ${inter.variable} ${baloo2.variable} ${fredoka.variable} ${poppins.variable}`} 
      suppressHydrationWarning
    >
      <head>
      </head>
      <body>
        <Script id="font-loader" strategy="beforeInteractive" dangerouslySetInnerHTML={{
          __html: `
            try {
              var savedFont = localStorage.getItem('hp-font') || 'manrope';
              document.documentElement.setAttribute('data-font', savedFont);
            } catch (e) {}
          `
        }} />
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
