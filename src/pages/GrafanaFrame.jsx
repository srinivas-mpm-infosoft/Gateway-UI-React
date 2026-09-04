import { useEffect, useRef, useState } from "react";

export default function GrafanaFrame() {
  const [theme, setTheme] = useState("light");
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);

  useEffect(() => {
    const handler = (event) => {
      if (event.data?.type === "SET_THEME") {
        setLoading(true);
        setTheme(event.data.theme);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Request true browser fullscreen (needs a user gesture the first time
  // in most browsers — see note below)
  const enterFullscreen = () => {
    const el = containerRef.current;
    if (el && !document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    }
  };

  const grafanaHost = window.location.hostname;
  const grafanaPort = "3000";
  const grafanaProtocol = window.location.protocol;
  const grafanaBaseUrl = `${grafanaProtocol}//${grafanaHost}:${grafanaPort}`;

  return (
    <div
      ref={containerRef}
      onClick={enterFullscreen}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        background: "#000",
        overflow: "hidden",
      }}
    >
      <iframe
        key={theme}
        title="grafana-dashboard"
        src={`${grafanaBaseUrl}/d/adrkjjk/sensor-monitoring-dashboard?kiosk&theme=${theme}`}
        onLoad={() => setLoading(false)}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          display: "block",
          opacity: loading ? 0 : 1,
          transition: "opacity 0.2s ease",
        }}
      />
    </div>
  );
}