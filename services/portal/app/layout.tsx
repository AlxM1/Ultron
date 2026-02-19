import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "00raiser Portal",
  description: "Admin dashboard for the 00raiser platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
