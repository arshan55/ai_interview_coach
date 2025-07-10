import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from '../components/Navigation';
import PageTransition from '../components/PageTransition';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "AI Interview Coach",
  description: "Practice your interview skills with AI-powered feedback",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Navigation />
        <PageTransition>
          {children}
        </PageTransition>
      </body>
    </html>
  );
}
