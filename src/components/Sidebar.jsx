const NAV_ITEMS = [
  { id: "io-settings", icon: "fa-sliders", label: "I/O Settings" },
  { id: "Wifi/4G", icon: "fa-wifi", label: "WiFi / 4G / Ethernet" },
  { id: "alarm", icon: "fa-bell", label: "Alarm", domId: "nav-alarms" },
  { id: "file-to-db", icon: "fa-file", label: "File to DB" },
  { id: "database", icon: "fa-database", label: "Database", domId: "nav-database" },
  { id: "admin-settings", icon: "fa-cog", label: "Admin Settings", domId: "nav-admin-settings" },
  { id: "change-password", icon: "fa-lock", label: "Change Password" },
  { id: "add-user", icon: "fa-user", label: "Add User" },
  { id: "logout", icon: "fa-right-from-bracket", label: "Logout" },
];

export default function Sidebar({ active, onSelect }) {
  return (
    <nav id="side-nav">
      <ul>
        {NAV_ITEMS.map(item => (
          <li
            key={item.id}
            id={item.domId}
            className={active === item.id ? "active" : ""}
            onClick={() => onSelect(item.id)}
          >
            <i className={`fa-solid ${item.icon}`} /> {item.label}
          </li>
        ))}
      </ul>
    </nav>
  );
}
