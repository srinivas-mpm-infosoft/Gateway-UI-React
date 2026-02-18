import { useState } from "react";
import Sidebar from "./components/Sidebar";
import WindowBar from "./components/WindowBar";
import MainPanel from "./components/MainPanel";
import Login from "./pages/login";

export default function App() {
  const [activePanel, setActivePanel] = useState("io-settings");

  return (
    <>
      {/* <WindowBar />
      <div className="container">
        <Sidebar active={activePanel} onSelect={setActivePanel} />
        <MainPanel panel={activePanel} />
      </div> */}
      <Login/>
    </>
  );
}
