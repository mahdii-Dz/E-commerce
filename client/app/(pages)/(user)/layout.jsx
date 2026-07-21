import "@/app/globals.css"
import Footer from "@/components/Footer";
import NavBar from "@/components/NavBar";
import { ContextProvider } from "@/app/context/Context"
import { Rubik } from "next/font/google";
import { Suspense } from "react";
import Loading from "./loading";


const RubikSans = Rubik({
  variable: "--font-Rubik-sans",
  subsets: ["latin"],
})


export const metadata = {
    title: "La Maison D'or",
    description: "صفحة La Maison D'or لبيع المفروشات",
};

export default function UserLayout({ children }) {
    return (
        <div dir="rtl" lang="ar" className={`${RubikSans.variable} font-sans antialiased bg-background w-full max-w-full min-h-screen `}>
            <ContextProvider>
                <NavBar />
                <main style={{ paddingTop: 'calc(var(--navbar-offset, 96px) + 16px)' }}>
                <Suspense fallback={<Loading />}>
                    {children}
                </Suspense>
                </main>
                <Footer />
            </ContextProvider>
        </div>
    );
}