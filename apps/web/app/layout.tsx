import type { Metadata } from "next";
import { Anek_Bangla, Tiro_Bangla, Noto_Sans_Bengali, Instrument_Sans } from "next/font/google";
import "./globals.css";

/* Bangla fonts per the Design System. Hind Siliguri is prohibited across this project. */
const anekBangla = Anek_Bangla({
  variable: "--font-anek-bangla",
  subsets: ["bengali", "latin"],
  weight: ["300", "400", "500"],
});

const tiroBangla = Tiro_Bangla({
  variable: "--font-tiro-bangla",
  subsets: ["bengali", "latin"],
  weight: "400",
});

const notoBengali = Noto_Sans_Bengali({
  variable: "--font-noto-bengali",
  subsets: ["bengali", "latin"],
  weight: ["300", "400", "500"],
});

const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Azmirs কনফিগারেটর",
  description: "আপনার মাপে বানানো কাস্টম ড্রেস: প্রিন্ট বাছুন, স্টাইল বাছুন, মাপ দিন।",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="bn"
      translate="no"
      className={`${anekBangla.variable} ${tiroBangla.variable} ${notoBengali.variable} ${instrument.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
