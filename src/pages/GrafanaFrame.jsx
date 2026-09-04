import { useEffect, useState } from "react";

export default function GrafanaFrame() {
  const [theme, setTheme] = useState("dark");
  const [loading, setLoading] = useState(false);

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

  // Use whatever host the React app was loaded from
  const grafanaHost = window.location.hostname;
  const grafanaPort = "3000";
  const grafanaProtocol = window.location.protocol; // match http/https to avoid mixed-content

  const grafanaBaseUrl = `${grafanaProtocol}//${grafanaHost}:${grafanaPort}`;

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000" }}>
      <iframe
        key={theme}
        src={`${grafanaBaseUrl}/d/adzrhsk/analog-readings?kiosk&theme=${theme}`}
        onLoad={() => setLoading(false)}
        style={{
          width: "125%",
          height: "120vh",
          border: "none",
          transform: "scale(0.8)",
          transformOrigin: "top left",
          opacity: loading ? 0 : 1,
          transition: "opacity 0.2s ease",
        }}
      />
    </div>
  );
}