import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kasir Bengkel Josjis",
  description: "Aplikasi Point of Sale untuk Bengkel Josjis",
  icons: {
    icon: "/josjis-mark.svg",
    shortcut: "/josjis-mark.svg",
    apple: "/josjis-mark.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-transparent text-slate-100 antialiased">
        <div className="relative flex min-h-screen w-full flex-col px-3 py-3 md:px-5 md:py-5">
          <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}