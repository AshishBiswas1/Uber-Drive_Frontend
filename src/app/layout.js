// src/app/layout.js
// TODO: Use the GPS to get correct coordinates
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata = {
  title: "RideFlex Pro - Smart Rides & Flexible Earnings",
  description: "Smarter rides for riders and flexible earnings for drivers. Built with live tracking, upfront pricing, and 24/7 support.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
