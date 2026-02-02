import Footer from "@/components/Footer";
import Main from "@/components/Main";
import SideBar from "@/components/SideBar";

export default function Home() {
  return (
    <div className="mt-32">
      <div className="flex gap-6 px-20">
        <SideBar/>
        <Main/>
      </div>
      <Footer/>
    </div>
  );
}
