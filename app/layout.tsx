import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Header from "@/components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI LABS - 바이브코딩 AI 앱 & 프롬프트 랩",
  description: "바이브코딩으로 만든 AI 앱과 프롬프트를 실험, 보관, 공유하는 AI LABS",
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
    title: "AI LABS - 바이브코딩 AI 앱 & 프롬프트 랩",
    description: "바이브코딩으로 만든 AI 앱과 프롬프트를 실험, 보관, 공유하는 AI LABS",
    images: [
      {
        url: "/ai-labs-og.png",
        width: 1200,
        height: 630,
        alt: "AI LABS - 바이브코딩 AI 앱 & 프롬프트 랩",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI LABS - 바이브코딩 AI 앱 & 프롬프트 랩",
    description: "바이브코딩으로 만든 AI 앱과 프롬프트를 실험, 보관, 공유하는 AI LABS",
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
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300`}
      >
        <ThemeProvider>
          <AuthProvider>
            <Header />
            <main className="min-h-screen">
              {children}
            </main>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
