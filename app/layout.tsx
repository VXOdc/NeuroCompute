import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "next-themes";

export const metadata: Metadata = {
  title: "NeuroCompute — Real-Time Vision System",
  description:
    "Browser-based AI perception interface. Real-time scene interpretation using Mistral Vision.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
  },
  openGraph: {
    title: "NeuroCompute",
    description: "Real-time AI vision system. Scene interpretation in the browser.",
    type: "website",
    images: [{ url: "/logo.svg" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning is required by next-themes:
    // the ThemeProvider adds a class to <html> on the client after hydration.
    // Without this attribute React logs a mismatch warning on every load.
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          // Allow the CSS transition on theme change (we added it in globals.css)
          disableTransitionOnChange={false}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
