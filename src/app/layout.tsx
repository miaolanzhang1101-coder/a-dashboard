import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "Autumn — Marlow House",
  description: "Is Autumn helping Marlow House get more direct bookings and revenue?",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body className="min-h-screen bg-canvas font-sans text-ink" style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
