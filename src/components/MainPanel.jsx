// import IOSettings from "./../pages/iosettings";
// import Wifi4G from "./../pages/Wifi4G";
// import Alarm from "./../pages/Alarm";
// import FileToDB from "./../pages/FileToDB";
// import DatabasePage from "./../pages/DatabasePage";
// import AdminSettings from "./../pages/AdminSettings";
// import ChangePassword from "./../pages/ChangePassword";
// import AddUser from "./../pages/AddUser";
// import { useState } from "react";
// import {targetUrl} from "./../config";

// // Map panel IDs that belong to IO Settings → their subTab value
// const IO_SUB_TAB_MAP = {
//   "io-general": "general",
//   //"io-analog": "analog",
//   //"io-digital": "digital",
//   "io-modbus-rtu": "modbus-rtu",
//   "io-modbus-tcp": "modbus-tcp",
//   // legacy alias
//   "io-settings": "general",
// };

// export default function MainPanel({ panel, user }) {
//   const logout = async () => {
//     try {
//       await fetch(`${targetUrl}/logout`, {
//         method: "POST",
//         credentials: 'include',
//       });
//     } catch (err) {
//       console.error(err);
//     }
//     window.location.href = "/";
//   };

//   if (panel === "logout") {
//     logout();
//     return (
//       <main id="main-panel">
//         <div>Logging out…</div>
//       </main>
//     );
//   }

//   const isReadOnly = user?.role === "user";

//   // Determine if the current panel is an IO sub-panel
//   const ioSubTab = IO_SUB_TAB_MAP[panel] ?? null;

//   return (
//     <main id="main-panel">
//       {/* ── I/O Settings (all sub-tabs share one mounted instance) ── */}
//       {ioSubTab !== null && (
//         <IOSettings
//           subTab={ioSubTab}
//           isReadOnly={isReadOnly}
//           role={user?.role}
//         />
//       )}

//       {/* ── Other pages ── */}
//       {panel === "Wifi/4G" && <Wifi4G isReadOnly={isReadOnly} />}
//       {panel === "alarm" && <Alarm isReadOnly={isReadOnly} />}
//       {panel === "file-to-db" && <FileToDB isReadOnly={isReadOnly} />}

//       {panel === "database" && user?.role !== "user" && (
//         <DatabasePage isReadOnly={isReadOnly} />
//       )}
//       {panel === "database" && user?.role === "user" && (
//         <div style={{ padding: 20, color: "#d32f2f" }}>
//           Access denied: database view available for admin/superadmin.
//         </div>
//       )}
      
//       {panel === "admin-settings" && user?.role !== "user" && (
//         <AdminSettings isReadOnly={isReadOnly} />
//       )}
//       {panel === "admin-settings" && user?.role === "user" && (
//         <div style={{ padding: 20, color: "#d32f2f" }}>
//           Access denied: admin settings available for admin/superadmin.
//         </div>
//       )}

//       {panel === "change-password" && <ChangePassword />}
//       {panel === "add-user" && <AddUser currentRole={user?.role || "user"} />}

//       {/* Fallback */}
//       {ioSubTab === null &&
//         panel !== "Wifi/4G" &&
//         panel !== "alarm" &&
//         panel !== "file-to-db" &&
//         panel !== "database" &&
//         panel !== "admin-settings" &&
//         panel !== "change-password" &&
//         panel !== "add-user" &&
//         panel !== "logout" && (
//           <div style={{ padding: 20 }}>Page not found</div>
//         )}
//     </main>
//   );
// }



import IOSettings from "./../pages/iosettings";
import Wifi4G from "./../pages/Wifi4G";
import Alarm from "./../pages/Alarm";
import FileToDB from "./../pages/FileToDB";
import DatabasePage from "./../pages/DatabasePage";
import AdminSettings from "./../pages/AdminSettings";
import ChangePassword from "./../pages/ChangePassword";
import UserManagement from "./../pages/UserManagement";
import RemoteDbSync from "./../pages/RemoteDbSync";
import { targetUrl } from "./../config";

// Normalize legacy 3-role → 7-role for permission checks
function normalizeRole(role) {
  return { superadmin: "administrator", admin: "plant_manager", user: "operator" }[role] ?? role;
}

const IO_SUB_TAB_MAP = {
  "io-general":    "general",
  "io-modbus-rtu": "modbus-rtu",
  "io-plc":        "plc",
  "io-scada":      "scada",
  "io-hmi":        "hmi",
  "io-mqtt":       "mqtt",
  "io-settings":   "general",   // legacy alias
  "io-modbus-tcp": "plc",       // legacy alias → PLC tab
};

// aa-access removed — User Management is the top-level nav item now
const AA_SUB_TAB_MAP = {
  "aa-live":      "live",
  "aa-rules":     "rules",
  "aa-audio":     "audio",
  "aa-devices":   "devices",
  "aa-analytics": "analytics",
  "aa-logs":      "logs",
  "aa-settings":  "settings",
};

const KNOWN_PANELS = new Set([
  "Wifi/4G", "alarm", "file-to-db", "database",
  "admin-settings", "change-password", "user-management", "logout",
  "io-rdb-mssql",
]);

export default function MainPanel({ panel, user }) {
  const logout = async () => {
    try {
      await fetch(`${targetUrl}/logout`, { method: "POST", credentials: "include" });
    } catch (err) {
      console.error(err);
    }
    window.location.href = "/";
  };

  if (panel === "logout") {
    logout();
    return <main id="main-panel"><div>Logging out…</div></main>;
  }

  const role   = normalizeRole(user?.role);
  const isAdmin = ["administrator", "plant_manager"].includes(role);
  const isReadOnly = !isAdmin;

  const ioSubTab  = IO_SUB_TAB_MAP[panel] ?? null;
  const aaSubTab  = AA_SUB_TAB_MAP[panel] ?? null;
  const isKnown   = ioSubTab !== null || aaSubTab !== null || KNOWN_PANELS.has(panel);

  return (
    <main id="main-panel">
      {/* ── I/O Settings ── */}
      {ioSubTab !== null && (
        <IOSettings subTab={ioSubTab} isReadOnly={isReadOnly} role={user?.role} />
      )}

      {/* ── Remote DB Sync (under I/O Settings) ── */}
      {panel === "io-rdb-mssql" && (
        <RemoteDbSync subTab="mssql" isReadOnly={isReadOnly} />
      )}

      {/* ── Other pages ── */}
      {panel === "Wifi/4G"    && <Wifi4G isReadOnly={isReadOnly} />}
      {panel === "alarm"      && <Alarm  isReadOnly={isReadOnly} />}
      {panel === "file-to-db" && <FileToDB isReadOnly={isReadOnly} />}

      {panel === "database" && (
        isAdmin
          ? <DatabasePage isReadOnly={isReadOnly} />
          : <div style={{ padding: 20, color: "#d32f2f" }}>Access denied: database view available for admin/superadmin.</div>
      )}

      {panel === "admin-settings" && (
        isAdmin
          ? <AdminSettings isReadOnly={isReadOnly} />
          : <div style={{ padding: 20, color: "#d32f2f" }}>Access denied: admin settings available for admin/superadmin.</div>
      )}

      {panel === "change-password" && <ChangePassword />}

      {/* ── User Management (replaces Add User) ── */}
      {panel === "user-management" && <UserManagement user={user} />}

      {/* Fallback */}
      {!isKnown && <div style={{ padding: 20 }}>Page not found</div>}
    </main>
  );
}
