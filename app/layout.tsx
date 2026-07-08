import type { Metadata } from "next";
import AuthProvider from "@/components/AuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Console — Claude Usage Dashboard",
  description: "A drag-and-drop dashboard for your Claude Code usage limits, time, and weather.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-body antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
