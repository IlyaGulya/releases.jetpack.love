import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Releases.Jetpack.Love",
  description: "Compare changelogs between different versions of popular libraries",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background text-foreground min-h-screen`}>
        <header className="border-b">
          <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold">Releases.Jetpack.Love</h1>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
