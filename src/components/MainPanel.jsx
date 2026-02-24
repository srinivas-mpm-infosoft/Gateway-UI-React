import IOSettings from './../pages/iosettings';
export default function MainPanel({ panel }) {

  return (
    <main id="main-panel">
      {panel === "io-settings" && <IOSettings/>}
      {panel === "Wifi/4G" && <div>WiFi / 4G / Ethernet</div>}
      {panel === "alarm" && <div>Alarm</div>}
      {panel === "file-to-db" && <div>File to DB</div>}
      {panel === "database" && <div>Database</div>}
      {panel === "admin-settings" && <div>Admin Settings</div>}
      {panel === "change-password" && <div>Change Password</div>}
      {panel === "add-user" && <div>Add User</div>}
      {panel === "logout" && <div>Logging out…</div>}
    </main>
  );
}
