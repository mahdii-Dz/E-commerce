import Main from "@/components/Main";
import SideBar from "@/components/SideBar";

export default function Home() {
  return (
    <div className="flex mt-32 gap-6 px-20">
      <SideBar/>
      <Main/>
    </div>
  );
}
