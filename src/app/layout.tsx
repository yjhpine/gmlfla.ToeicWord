import type { Metadata } from "next";
import { Noto_Sans_KR, Fraunces } from "next/font/google";
import { AppNav } from "@/components/AppNav";
import "./globals.css";

const sans = Noto_Sans_KR({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "희림 토익 단어장",
  description: "날짜별 영단어 학습과 시험",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${sans.variable} ${display.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--fg)]">
        <AppNav />
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
