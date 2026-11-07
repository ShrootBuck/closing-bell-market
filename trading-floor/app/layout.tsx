import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Closing Bell — TSLA trading floor",
  description: "Trade the class. Survive the feed.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
