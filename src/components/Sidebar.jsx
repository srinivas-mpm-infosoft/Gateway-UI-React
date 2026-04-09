import React, { useState, useEffect } from "react";
import {
  Sliders, Wifi, Bell, FileText, Database,
  Settings, Lock, UserPlus, LogOut,
  Settings2, Activity, Zap, Cpu, Network,
  ChevronDown,
} from "lucide-react";

const NAV_ITEMS = [
  { id: "io-settings-group", icon: Sliders,   label: "I/O Settings",        isGroup: true },
  // { id: "Wifi/4G",           icon: Wifi,      label: "WiFi / 4G / Ethernet" },
  // { id: "alarm",             icon: Bell,      label: "Alarm",               domId: "nav-alarms" },
  // { id: "file-to-db",        icon: FileText,  label: "File to DB" },
  { id: "database",          icon: Database,  label: "Database",            domId: "nav-database" },
  // { id: "admin-settings",    icon: Settings,  label: "Admin Settings",      domId: "nav-admin-settings" },
  { id: "change-password",   icon: Lock,      label: "Change Password" },
  { id: "add-user",          icon: UserPlus,  label: "Add User" },
  { id: "logout",            icon: LogOut,    label: "Logout" },
];

const IO_SUB_ITEMS = [
  { id: "io-general",    icon: Settings2, label: "General" },
  // { id: "io-analog",     icon: Activity,  label: "Analog I/O" },
  // { id: "io-digital",    icon: Zap,       label: "Digital I/O" },
  { id: "io-modbus-rtu", icon: Cpu,       label: "Modbus RTU" },
  // { id: "io-modbus-tcp", icon: Network,   label: "Modbus TCP" },
];

const IO_PANEL_IDS = new Set(IO_SUB_ITEMS.map((i) => i.id));

export default function Sidebar({ active, onSelect, role }) {
  const [ioOpen, setIoOpen] = useState(() => IO_PANEL_IDS.has(active));

  useEffect(() => {
    if (IO_PANEL_IDS.has(active)) setIoOpen(true);
  }, [active]);

  const allowedItems = NAV_ITEMS.filter((item) => {
    if (role === "user" && (item.id === "database" || item.id === "admin-settings")) return false;
    return true;
  });

  const isIOActive = IO_PANEL_IDS.has(active);

  return (
    <nav
      className="w-56 h-full flex flex-col border-r border-white/5"
      style={{ background: "#111827" }}
    >
      {/* Logo strip */}
      <div className="px-4 py-4 border-b border-white/5 flex items-center gap-2.5">
        <div
          className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
          style={{ background: "#2563eb22", border: "1px solid #2563eb44" }}
        >
          <Cpu size={12} style={{ color: "#60a5fa" }} />
        </div>
        <span className="text-sm font-semibold tracking-wide" style={{ color: "#e2e8f0" }}>
          Gateway
        </span>
      </div>

      {/* Items */}
      <ul className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {allowedItems.map((item) => {
          const Icon = item.icon;

          /* ── I/O expandable group ── */
          if (item.isGroup) {
            return (
              <li key={item.id}>
                <button
                  onClick={() => setIoOpen((o) => !o)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors duration-100"
                  style={
                    isIOActive
                      ? { background: "#1e3a5f22", color: "#93c5fd", borderLeft: "2px solid #3b82f6" }
                      : { color: "#6b7280" }
                  }
                  onMouseEnter={(e) => { if (!isIOActive) e.currentTarget.style.color = "#d1d5db"; }}
                  onMouseLeave={(e) => { if (!isIOActive) e.currentTarget.style.color = "#6b7280"; }}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={15} style={{ color: isIOActive ? "#60a5fa" : "#4b5563" }} />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <ChevronDown
                    size={13}
                    style={{
                      color: "#4b5563",
                      transform: ioOpen ? "rotate(0deg)" : "rotate(-90deg)",
                      transition: "transform 0.2s",
                    }}
                  />
                </button>

                {/* Sub-items with smooth max-height animation */}
                <div
                  style={{
                    maxHeight: ioOpen ? `${IO_SUB_ITEMS.length * 38}px` : "0px",
                    overflow: "hidden",
                    transition: "max-height 0.2s ease",
                  }}
                >
                  <div className="mt-0.5 ml-3 pl-3 space-y-0.5" style={{ borderLeft: "1px solid #1f2937" }}>
                    {IO_SUB_ITEMS.map((sub) => {
                      const SubIcon = sub.icon;
                      const isSubActive = active === sub.id;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => onSelect(sub.id)}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-[12.5px] font-medium transition-colors duration-100"
                          style={
                            isSubActive
                              ? { background: "#1e3a5f33", color: "#93c5fd" }
                              : { color: "#4b5563" }
                          }
                          onMouseEnter={(e) => { if (!isSubActive) e.currentTarget.style.color = "#9ca3af"; }}
                          onMouseLeave={(e) => { if (!isSubActive) e.currentTarget.style.color = "#4b5563"; }}
                        >
                          <SubIcon size={12} style={{ color: isSubActive ? "#60a5fa" : "#374151" }} />
                          {sub.label}
                          {isSubActive && (
                            <span
                              className="ml-auto rounded-full flex-shrink-0"
                              style={{ width: 5, height: 5, background: "#3b82f6" }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </li>
            );
          }

          /* ── Regular item ── */
          const isActive = active === item.id;
          return (
            <li key={item.id} id={item.domId}>
              <button
                onClick={() => onSelect(item.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-100"
                style={
                  isActive
                    ? { background: "#1e3a5f22", color: "#93c5fd", borderLeft: "2px solid #3b82f6" }
                    : { color: "#6b7280" }
                }
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = "#d1d5db"; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = "#6b7280"; }}
              >
                <Icon size={15} style={{ color: isActive ? "#60a5fa" : "#4b5563" }} />
                {item.label}
                {isActive && (
                  <span
                    className="ml-auto rounded-full"
                    style={{ width: 5, height: 5, background: "#3b82f6", flexShrink: 0 }}
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/5 text-center">
        <p className="text-[10px] uppercase tracking-widest" style={{ color: "#374151" }}>
          Gateway v2.0.26
        </p>
      </div>
    </nav>
  );
}
