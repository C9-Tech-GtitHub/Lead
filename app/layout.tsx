import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lead Research Platform",
  description:
    "Discover, research, and grade local businesses automatically using AI",
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
              try {
                const darkMode = localStorage.getItem('darkMode');
                // Default to dark mode if no preference is set
                if (darkMode === null || darkMode === 'true') {
                  document.documentElement.classList.add('dark');
                  if (darkMode === null) {
                    localStorage.setItem('darkMode', 'true');
                  }
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
