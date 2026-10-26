import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Reelo · Administration",
  description: "Reelo moderation and operations",
};
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
