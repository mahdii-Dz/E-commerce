import "./globals.css";
import { Rubik } from "next/font/google";
import Providers from "./providers";
import GoogleTagManager from "@/components/GoogleTagManager";
import RouteProgress from "@/components/RouteProgress";


const RubikSans = Rubik({
  variable: "--font-Rubik-sans",
  subsets: ["latin"],
})


export const metadata = {
  title: "La Maison D'or",
  description: "صفحة La Maison D'or لبيع المفروشات",
  openGraph: {
    type: 'website',
    siteName: "La Maison D'or",
    title: "La Maison D'or",
    description: "صفحة La Maison D'or لبيع المفروشات",
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
       <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      <body
        className={`${RubikSans.variable} font-sans antialiased bg-background w-full h-auto `}
      >
        <Providers>
          <RouteProgress />
          {children}
        </Providers>
          <GoogleTagManager />
      </body>
    </html>
  );
}