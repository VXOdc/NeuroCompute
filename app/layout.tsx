import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NeuroCompute — Real-Time Vision System",
  description:
    "Browser-based AI perception interface. Real-time scene interpretation using Mistral Vision.",
  openGraph: {
    title: "NeuroCompute",
    description: "Real-time AI vision system. Scene interpretation in the browser.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
