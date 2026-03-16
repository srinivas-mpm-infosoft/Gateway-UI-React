import React from "react";
import { 
  Sliders, Wifi, Bell, FileText, Database, 
  Settings, Lock, UserPlus, LogOut 
} from "lucide-react";

const NAV_ITEMS = [
  { id: "io-settings", icon: Sliders, label: "I/O Settings" },
  { id: "Wifi/4G", icon: Wifi, label: "WiFi / 4G / Ethernet" },
  { id: "alarm", icon: Bell, label: "Alarm", domId: "nav-alarms" },
  { id: "file-to-db", icon: FileText, label: "File to DB" },
  { id: "database", icon: Database, label: "Database", domId: "nav-database" },
  { id: "admin-settings", icon: Settings, label: "Admin Settings", domId: "nav-admin-settings" },
  { id: "change-password", icon: Lock, label: "Change Password" },
  { id: "add-user", icon: UserPlus, label: "Add User" },
  { id: "logout", icon: LogOut, label: "Logout" },
];

export default function Sidebar({ active, onSelect, role }) {
  const allowedItems = NAV_ITEMS.filter((item) => {
    if (role === "user" && (item.id === "database" || item.id === "admin-settings")) {
      return false;
    }
    return true;
  });

  return (
    <nav className="w-56 h-full bg-[#34393b] text-[#bce6f8] flex flex-col border-r border-slate-700 shadow-xl">
      <ul className="flex-1">
        {allowedItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <li
              key={item.id}
              id={item.domId}
              onClick={() => onSelect(item.id)}
              className={`flex items-center gap-3 px-6 py-4 cursor-pointer transition-all duration-200 border-b border-[#444] ${isActive ? "bg-[#3e838f] text-white border-l-4 border-l-[#FFD366]" : "hover:bg-[#3e838f]/50 hover:text-white"}`}
            >
              <Icon size={18} className={isActive ? "text-white" : "text-[#bce6f8]"} />
              <span className="text-[15px] font-medium tracking-wide">{item.label}</span>
            </li>
          );
        })}
      </ul>
      <div className="p-4 text-[10px] text-slate-500 uppercase tracking-widest text-center border-t border-[#444]">
        Gateway v2.0.26
      </div>
    </nav>
  );
}
