import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { OneTimeAccessProvider } from "@/contexts/OneTimeAccessContext";
import { ToastProvider } from "@/contexts/ToastContext";
import Header from "@/components/Header";
import ScrollToTop from "@/components/ScrollToTop";
import NextTopLoader from "nextjs-toploader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "아크의실험실 | 바이브코딩 연구소",
  description: "바이브코딩으로 AI 앱을 만들고 실험하는 아크의실험실 — AI 교육, 프롬프트 아카이브, 앱 제작 의뢰까지",
  keywords: ["아크의실험실", "바이브코딩 연구소", "AI 교육", "바이브코딩 강의", "프롬프트 아카이브", "AI 앱 제작", "Claude 바이브코딩", "AI 도구 활용", "바이브코딩 앱", "AI 활용 교육"],
  verification: {
    google: "CrsqfluWvBwJIFib6iTgOLVt6vnAzq5R2LT17mz2sig",
    other: {
      "naver-site-verification": "6f37bb3ab40f93f02c850efec98ce0b6ef0dc410",
    },
  },
  icons: {
    icon: [
      { url: "/favicon_io/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon_io/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: { url: "/favicon_io/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    shortcut: "/favicon_io/favicon.ico",
  },
  manifest: "/favicon_io/site.webmanifest",
  openGraph: {
    title: "아크의실험실 | 바이브코딩 연구소",
    description: "바이브코딩으로 AI 앱을 만들고 실험하는 아크의실험실 — AI 교육, 프롬프트 아카이브, 앱 제작 의뢰까지",
    images: [
      {
        url: "/ai-labs-og.png",
        width: 1200,
        height: 630,
        alt: "아크의실험실 | 바이브코딩 연구소",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "아크의실험실 | 바이브코딩 연구소",
    description: "바이브코딩으로 AI 앱을 만들고 실험하는 아크의실험실 — AI 교육, 프롬프트 아카이브, 앱 제작 의뢰까지",
    images: ["/ai-labs-og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": "https://ai-service-hub.vercel.app/#organization",
                  "name": "아크의실험실",
                  "alternateName": ["바이브코딩 연구소", "AK LABS"],
                  "url": "https://ai-service-hub.vercel.app",
                  "logo": {
                    "@type": "ImageObject",
                    "url": "https://ai-service-hub.vercel.app/favicon_io/apple-touch-icon.png"
                  },
                  "description": "바이브코딩으로 AI 앱을 만들고 실험하는 아크의실험실 — AI 교육, 프롬프트 아카이브, 앱 제작 의뢰까지",
                  "sameAs": [
                    "https://www.youtube.com/@아크의실험실"
                  ]
                },
                {
                  "@type": "WebSite",
                  "@id": "https://ai-service-hub.vercel.app/#website",
                  "url": "https://ai-service-hub.vercel.app",
                  "name": "아크의실험실 | 바이브코딩 연구소",
                  "publisher": {
                    "@id": "https://ai-service-hub.vercel.app/#organization"
                  },
                  "potentialAction": {
                    "@type": "SearchAction",
                    "target": {
                      "@type": "EntryPoint",
                      "urlTemplate": "https://ai-service-hub.vercel.app/apps?q={search_term_string}"
                    },
                    "query-input": "required name=search_term_string"
                  }
                }
              ]
            })
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme') || 'dark';
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              })();
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function() {});
                });
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300`}
      >
        <ThemeProvider>
          <NextTopLoader
            color="linear-gradient(90deg, #3b82f6, #8b5cf6)"
            initialPosition={0.12}
            crawlSpeed={180}
            height={3}
            crawl
            showSpinner={false}
            easing="ease"
            speed={220}
          />
          <ToastProvider>
            <OneTimeAccessProvider>
              <AuthProvider>
                <Header />
                <main className="min-h-screen">
                  {children}
                </main>
                <ScrollToTop />
              </AuthProvider>
            </OneTimeAccessProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
