import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Perspectra — before you believe it, take a closer look",
  description:
    "Before you believe it, take a closer look. Examine claims, reasoning, and counter-perspectives with Perspectra. Runs locally on this machine.",
};

/**
 * Applies the saved theme before first paint so there is no flash of the wrong
 * palette. Dark is the default — the demo runs on a projector.
 */
const themeScript = `try{var t=localStorage.getItem('perspectra-theme');document.documentElement.dataset.theme=t==='light'?'light':'dark';}catch(e){document.documentElement.dataset.theme='dark';}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
