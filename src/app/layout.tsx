import React, { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Inter, Syne, Outfit, Manrope } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
const syne = Syne({ subsets: ["latin"], display: "swap", variable: "--font-syne" });
const outfit = Outfit({ subsets: ["latin"], display: "swap", variable: "--font-outfit" });
const manrope = Manrope({ subsets: ["latin"], display: "swap", variable: "--font-manrope" });
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "../contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import MainLayout from "@/components/layout/MainLayout";
import { SpeedInsights } from "@vercel/speed-insights/next";
import AnalyticsTags from "@/components/marketing/AnalyticsTags";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Viewer — Social Media",
  description: "A premium social media experience for visual storytelling",
  keywords: ["social media", "photos", "sharing", "viewer"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Viewer",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "application-name": "Viewer",
    "apple-mobile-web-app-title": "Viewer",
    "theme-color": "#6366f1",
    "msapplication-navbutton-color": "#6366f1",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "msapplication-starturl": "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${syne.variable} ${outfit.variable} ${manrope.variable}`} suppressHydrationWarning>
        <AuthProvider>
          <ThemeProvider>
            <ToastProvider>
              <MainLayout>
                {children}
              </MainLayout>
            </ToastProvider>
            <SpeedInsights />
          </ThemeProvider>
        </AuthProvider>
        <Suspense fallback={null}>
          <AnalyticsTags />
        </Suspense>
      </body>
    </html>
  );
}
