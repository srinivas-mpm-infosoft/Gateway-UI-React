import React, { useState, useEffect } from "react";
import {
  Settings2,
  Activity,
  Cpu,
  Network,
  Zap,
  Save,
  Loader2,
  AlertCircle, CheckCircle2, X
} from "lucide-react";

import AnalogIO from "./AnalogIO";
import { useToast } from "../components/ToastContext";
import DigitalIO from "./DigitalIO";
import ModbusRTU from "./ModbusRTU";
import ModbusTCP from "./ModbusTCP";

export default function IOSettings() {
  const [config, setConfig] = useState(null);
  const [subTab, setSubTab] = useState("Settings");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const showToast = useToast();

  useEffect(() => {
    fetch("/config")
      .then((res) => res.json())
      .then((data) => {
        setConfig(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Load failed", err);
        setLoading(false);
      });
  }, []);

  const saveConfig = async (updatedConfig) => {
    setIsSaving(true);
    try {
      const res = await fetch("/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig),
      });
      if (res.ok) {
        setConfig(updatedConfig);
        // Determine message based on current tab
        let message = "Settings updated!";
        if (subTab === "Settings") message = "Module switches updated successfully!";
        if (subTab === "Analog I/O") message = "Analog calibration saved!";
        if (subTab === "Digital I/O") message = "Digital channels updated!";

        showToast(message, "success");
      } else {
        showToast("Failed to save settings", "error");
      }
    } catch (e) {
      showToast("Network error occurred", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin mb-4 text-indigo-600" />
        <p className="font-medium">Loading System Configuration...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="m-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
        <AlertCircle className="h-5 w-5" />
        <p className="font-medium">Error: Could not connect to gateway controller.</p>
      </div>
    );
  }

  const tabs = [
    { id: "Settings", icon: Settings2, label: "General" },
    { id: "Analog I/O", icon: Activity, label: "Analog" },
    { id: "Digital I/O", icon: Zap, label: "Digital" },
    { id: "Modbus RTU", icon: Cpu, label: "Modbus RTU" },
    { id: "Modbus TCP", icon: Network, label: "Modbus TCP" },
  ];

  return (
    /* 1. Parent must be h-screen (or h-full if App.jsx is h-screen) 
       2. overflow-hidden prevents the whole page from scrolling
    */

    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      {/* --- TOAST NOTIFICATION --- */}

      {/* --- TOP-CENTER TOAST NOTIFICATION --- */}

      {/* FIXED HEADER: flex-shrink-0 ensures this never collapses or moves */}
      <div className="flex-shrink-0 p-6 bg-white border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">I/O Configuration</h1>
        <p className="text-slate-500 text-sm">Enable and configure hardware communication protocols.</p>
      </div>

      {/* WRAPPER FOR SIDEBAR + CONTENT: h-full here fills the remaining space */}
      <div className="flex flex-1 overflow-hidden">

        {/* FIXED SIDEBAR: No overflow property means it stays put */}
        <aside className="w-64 flex-shrink-0 p-6 border-r border-slate-200 bg-white">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSubTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${subTab === tab.id
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* INDEPENDENT SCROLL ZONE: Only the white area with forms/tables scrolls */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="animate-in fade-in duration-300">
                {subTab === "Settings" && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="mb-6 border-b border-slate-100 pb-4">
                      <h2 className="text-lg font-semibold text-slate-800">Module Master Switches</h2>
                      <p className="text-sm text-slate-500">Enable or disable core I/O subsystems.</p>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.target);
                        const nc = JSON.parse(JSON.stringify(config));
                        nc.ioSettings.settings.modbus = fd.get("modbus") === "on";
                        nc.ioSettings.settings.modbusTCP = fd.get("modbusTCP") === "on";
                        nc.ioSettings.settings.analog = fd.get("analog") === "on";
                        nc.ioSettings.settings.digitalInput = fd.get("digitalInput") === "on";
                        saveConfig(nc);
                      }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { name: "modbus", label: "Modbus RTU Protocol", checked: config.ioSettings.settings?.modbus },
                          { name: "modbusTCP", label: "Modbus TCP/IP Protocol", checked: config.ioSettings.settings?.modbusTCP },
                          { name: "analog", label: "Analog Input/Output", checked: config.ioSettings.settings?.analog },
                          { name: "digitalInput", label: "Digital Input/Output", checked: config.ioSettings.settings?.digitalInput },
                        ].map((item) => (
                          <label
                            key={item.name}
                            className="flex items-center p-4 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer group"
                          >
                            <input
                              type="checkbox"
                              name={item.name}
                              defaultChecked={item.checked}
                              className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all"
                            />
                            <span className="ml-3 font-medium text-slate-700 group-hover:text-slate-900">
                              {item.label}
                            </span>
                          </label>
                        ))}
                      </div>

                      <div className="pt-6 mt-6 border-t border-slate-100">
                        <button
                          type="submit"
                          disabled={isSaving}
                          className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm transition-all disabled:opacity-70"
                        >
                          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          {isSaving ? "Saving..." : "Save Module Settings"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Other Sub-Tabs */}
                <div className="animate-in fade-in duration-300">
                  {subTab === "Analog I/O" && <AnalogIO config={config} onSave={saveConfig} />}
                  {subTab === "Digital I/O" && <DigitalIO config={config} onSave={saveConfig} setConfig={setConfig} />}
                  {subTab === "Modbus RTU" && <ModbusRTU config={config} onSave={saveConfig} setConfig={setConfig} />}
                  {subTab === "Modbus TCP" && <ModbusTCP config={config} onSave={saveConfig} setConfig={setConfig} />}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}