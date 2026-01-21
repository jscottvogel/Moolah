import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ConfigureAmplify from "@/components/ConfigureAmplify";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Moolah | Agentic Dividend Optimizer",
  description: "Generate production-grade dividend portfolios with AI. Optimized for income growth & tax efficiency.",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased min-h-screen bg-background text-foreground selection:bg-purple-500/30`}>
        <ConfigureAmplify />
        {children}
      </body>
    </html>
  );
}
