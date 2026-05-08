import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quiz for Friends",
  description: "Self-hosted платформа для домашних квизов"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="grain min-h-screen bg-cinema-radial font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
