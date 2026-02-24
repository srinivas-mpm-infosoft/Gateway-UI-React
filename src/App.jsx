import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import WindowBar from "./components/WindowBar";
import MainPanel from "./components/MainPanel";
import Login from "./pages/login";
import './App.css'

export default function App() {
  const [activePanel, setActivePanel] = useState("io-settings");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ask the server if we are logged in
    async function verifySession() {
      try {
        const res = await fetch("/whoami");
        if (res.ok) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (err) {
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    }

    verifySession();
  }, []);

  // Show a blank screen or spinner while checking
  if (loading) return <div className="min-h-screen bg-[#dfe3ea]" />;

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <>
      <WindowBar />
      <div className="container">
        <Sidebar active={activePanel} onSelect={setActivePanel} />
        <MainPanel panel={activePanel} />
      </div>
    </>
  );
}