import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lead Research Platform",
  description: "Discover, research, and grade local businesses automatically using AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
