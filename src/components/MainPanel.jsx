import IOSettings from "./../pages/iosettings";
import Wifi4G from "./../pages/Wifi4G";
import Alarm from "./../pages/Alarm";
import FileToDB from "./../pages/FileToDB";
import DatabasePage from "./../pages/DatabasePage";
import AdminSettings from "./../pages/AdminSettings";
import ChangePassword from "./../pages/ChangePassword";
import AddUser from "./../pages/AddUser";
import { useState } from "react";

// Map panel IDs that belong to IO Settings → their subTab value
const IO_SUB_TAB_MAP = {
  "io-general": "general",
  "io-analog": "analog",
  "io-digital": "digital",
  "io-modbus-rtu": "modbus-rtu",
  "io-modbus-tcp": "modbus-tcp",
  // legacy alias
  "io-settings": "general",
};

export default function MainPanel({ panel, user }) {
  const logout = async () => {
    try {
      await fetch("/logout", { method: "POST" });
    } catch (err) {
      console.error(err);
    }
    window.location.href = "/";
  };

  if (panel === "logout") {
    logout();
    return (
      <main id="main-panel">
        <div>Logging out…</div>
      </main>
    );
  }

  const isReadOnly = user?.role === "user";

  // Determine if the current panel is an IO sub-panel
  const ioSubTab = IO_SUB_TAB_MAP[panel] ?? null;

  return (
    <main id="main-panel">
      {/* ── I/O Settings (all sub-tabs share one mounted instance) ── */}
      {ioSubTab !== null && (
        <IOSettings
          subTab={ioSubTab}
          isReadOnly={isReadOnly}
          role={user?.role}
        />
      )}

      {/* ── Other pages ── */}
      {panel === "Wifi/4G" && <Wifi4G isReadOnly={isReadOnly} />}
      {panel === "alarm" && <Alarm isReadOnly={isReadOnly} />}
      {panel === "file-to-db" && <FileToDB isReadOnly={isReadOnly} />}

      {panel === "database" && user?.role !== "user" && (
        <DatabasePage isReadOnly={isReadOnly} />
      )}
      {panel === "database" && user?.role === "user" && (
        <div style={{ padding: 20, color: "#d32f2f" }}>
          Access denied: database view available for admin/superadmin.
        </div>
      )}
      {/* 
      {panel === "admin-settings" && user?.role !== "user" && (
        <AdminSettings isReadOnly={isReadOnly} />
      )}
      {panel === "admin-settings" && user?.role === "user" && (
        <div style={{ padding: 20, color: "#d32f2f" }}>
          Access denied: admin settings available for admin/superadmin.
        </div>
      )} */}

      {panel === "change-password" && <ChangePassword />}
      {panel === "add-user" && <AddUser currentRole={user?.role || "user"} />}

      {/* Fallback */}
      {ioSubTab === null &&
        panel !== "Wifi/4G" &&
        panel !== "alarm" &&
        panel !== "file-to-db" &&
        panel !== "database" &&
        panel !== "admin-settings" &&
        panel !== "change-password" &&
        panel !== "add-user" &&
        panel !== "logout" && (
          <div style={{ padding: 20 }}>Page not found</div>
        )}
    </main>
  );
}
