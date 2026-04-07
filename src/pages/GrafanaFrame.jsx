// import { useEffect, useRef } from "react";

// export default function GrafanaFrame({ theme }) {
//   const iframeRef = useRef(null);

//   // 🔥 SEND THEME TO GRAFANA (NO RELOAD)
//   useEffect(() => {
//     if (!iframeRef.current) return;

//     iframeRef.current.contentWindow?.postMessage(
//       {
//         type: "SET_THEME",
//         theme: theme,
//       },
//       "*"
//     );
//   }, [theme]);

//   return (
//     <iframe
//       ref={iframeRef}
//       src="http://10.42.0.183:3000/d/ad666l4/mixer-dashboard?kiosk"
//       style={{
//         position: "fixed",
//         inset: 0,
//         width: "100%",
//         height: "100%",
//         border: "none",
//         zIndex: 0,
//       }}
//     />
//   );
// }

import { useEffect, useState } from "react";

export default function GrafanaFrame() {
  const [theme, setTheme] = useState("dark");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
const handler = (event) => {
  if (event.data?.type === "SET_THEME") {
    console.log("THEME FROM GRAFANA:", event.data.theme);

    setLoading(true);
    setTheme(event.data.theme);
  }
};

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  return (
    <iframe
      key={theme}
      src={`http://10.42.0.183:3000/d/ad666l4/mixer-dashboard?kiosk&theme=${theme}`}
      onLoad={() => setLoading(false)}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        border: "none",
        opacity: loading ? 0 : 1,
        transition: "opacity 0.2s ease",
      }}
    />
  );
}