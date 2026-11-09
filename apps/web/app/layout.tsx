import type { Metadata } from "next";
import { EB_Garamond, IM_Fell_English } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const fell = IM_Fell_English({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-fell",
});

const garamond = EB_Garamond({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-garamond",
});

export const metadata: Metadata = {
  title: "Living Historical Journeys",
  description:
    "Follow history in real time — or scaled time — on a period-styled map.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${fell.variable} ${garamond.variable}`}>
      <body>{children}</body>
    </html>
  );
}
