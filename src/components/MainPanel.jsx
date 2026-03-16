import IOSettings from "./../pages/iosettings";
import Wifi4G from "./../pages/Wifi4G";
import Alarm from "./../pages/Alarm";
import FileToDB from "./../pages/FileToDB";
import DatabasePage from "./../pages/DatabasePage";
import AdminSettings from "./../pages/AdminSettings";
import ChangePassword from "./../pages/ChangePassword";
import AddUser from "./../pages/AddUser";
import { useState } from "react";

export default function MainPanel({ panel, user }) {
  const [loggedOut, setLoggedOut] = useState(false);

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
    return <main id="main-panel"><div>Logging out…</div></main>;
  }

  const isReadOnly = user?.role === "user";

  return (
    <main id="main-panel">
      {panel === "io-settings" && <IOSettings isReadOnly={isReadOnly} />}
      {panel === "Wifi/4G" && <Wifi4G isReadOnly={isReadOnly} />}
      {panel === "alarm" && <Alarm isReadOnly={isReadOnly} />}
      {panel === "file-to-db" && <FileToDB isReadOnly={isReadOnly} />}
      {panel === "database" && user?.role !== "user" && <DatabasePage isReadOnly={isReadOnly} />}
      {panel === "admin-settings" && user?.role !== "user" && <AdminSettings isReadOnly={isReadOnly} />}
      {panel === "change-password" && <ChangePassword />}
      {panel === "add-user" && <AddUser currentRole={user?.role || "user"} />}
      {panel === "database" && user?.role === "user" && (
        <div style={{ padding: 20, color: "#d32f2f" }}>Access denied: database view available for admin/superadmin.</div>
      )}
      {panel === "admin-settings" && user?.role === "user" && (
        <div style={{ padding: 20, color: "#d32f2f" }}>Access denied: admin settings available for admin/superadmin.</div>
      )}
      {panel !== "io-settings" && panel !== "Wifi/4G" && panel !== "alarm" && panel !== "file-to-db" && panel !== "database" && panel !== "admin-settings" && panel !== "change-password" && panel !== "add-user" && panel !== "logout" && <div>Page not found</div>}
    </main>
  );
}
