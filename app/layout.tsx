import type { Metadata, Viewport } from "next";
import { Nunito, Manrope, Inter, Baloo_2, Fredoka, Poppins } from "next/font/google";
import "./globals.css";
import Shell from "@/components/layout/Shell";
import PWARegistration from "@/components/pwa/PWARegistration";

import OfflineToast from "@/components/pwa/OfflineToast";
import { HPProvider } from "@/lib/HPContext";
import Script from "next/script";
import GlobalClickInterceptor from "@/components/ui/GlobalClickInterceptor";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-nunito",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

const baloo2 = Baloo_2({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-baloo2",
});

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fredoka",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
});

export const viewport: Viewport = {
  themeColor: "#0F1F33",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
              var savedFont = localStorage.getItem('hp-font') || 'nunito';
              document.documentElement.setAttribute('data-font', savedFont);
            } catch (e) {}
          `
        }} />
        <Script id="theme-loader" strategy="beforeInteractive" dangerouslySetInnerHTML={{
          __html: `
            try {
              var saved = localStorage.getItem('hp-theme');
              var theme = saved || 'light';
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
