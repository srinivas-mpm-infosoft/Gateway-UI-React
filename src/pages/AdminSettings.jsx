import React, { useEffect, useState } from "react";
import { Loader2, AlertCircle, X } from "lucide-react";
import { useToast } from "../components/ToastContext";
import {targetUrl} from "../config";


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function deepClone(v) { return JSON.parse(JSON.stringify(v)); }

const DEFAULT_ENG_UNITS = [
  { type: "temperature", symbols: ["°C", "°F"] },
  { type: "flow",        symbols: ["L/min", "m³/h"] },
  { type: "pressure",   symbols: ["bar", "psi", "Pa"] },
  { type: "level",      symbols: ["%", "m"] },
  { type: "energy",     symbols: ["kWh", "Wh"] },
  { type: "voltage",    symbols: ["V"] },
  { type: "current",    symbols: ["A", "mA"] },
];

function ensureBase(cfg) {
  const next = deepClone(cfg ?? {});

  next.adminSettings ??= {};
  next.adminSettings.mailBody ??= {};
  next.adminSettings.mailBody.analog     ??= "";
  next.adminSettings.mailBody.digital    ??= "";
  next.adminSettings.mailBody.modbus_rtu ??= "";
  next.adminSettings.mailBody.plc        ??= "";
  if (!Array.isArray(next.adminSettings.rs485Ports))
    next.adminSettings.rs485Ports = [];
  if (!Array.isArray(next.adminSettings.engineeringUnits))
    next.adminSettings.engineeringUnits = DEFAULT_ENG_UNITS;

  next.smtp ??= { server: "", port: 587, user: "", password: "" };

  next.ioSettings ??= {};
  next.ioSettings.analog ??= {};
  next.ioSettings.analog.generate_random ??= false;
  next.ioSettings.digitalInput ??= {};
  next.ioSettings.digitalInput.generate_random ??= false;

  return next;
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------
const inp = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 text-slate-700 disabled:bg-slate-50 disabled:text-slate-400";
const lbl = "text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block";

// ---------------------------------------------------------------------------
// Small reusable pieces
// ---------------------------------------------------------------------------
function MailBodyEditor({ value, disabled, onChange }) {
  return (
    <div className="space-y-2">
      <label className={lbl}>Mail Body</label>
      <textarea
        rows={6}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Email message template…"
        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 text-slate-700 disabled:bg-slate-50 disabled:text-slate-400 resize-y"
      />
    </div>
  );
}

function RandomCheckbox({ label, checked, disabled, onChange }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={!!checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 accent-zinc-700"
      />
      <span className="text-sm text-slate-600 font-medium">{label}</span>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const MAIN_TABS = ["analog", "digital", "modbus_rtu", "Modbus TCP", "smtp"];

const RTU_SUBTABS = [
  { key: "mail",        label: "Mail Body" },
  { key: "rs485",       label: "RS485 Ports" },
  { key: "engineering", label: "Engineering Units" },
];

export default function AdminSettings({ isReadOnly }) {
  const showToast = useToast();

  const [config, setConfig]    = useState(null);
  const [loading, setLoading]  = useState(true);
  const [localCfg, setLocalCfg] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("analog");
  const [rtuSubTab, setRtuSubTab] = useState("mail");

  // Fetch config on mount
  useEffect(() => {
    fetch(`${targetUrl}/config`,{
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((data) => {
        const base = ensureBase(data);
        setConfig(base);
        setLocalCfg(base);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Load failed", err);
        setLoading(false);
      });
  }, []);

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------
  const save = async () => {
    if (isReadOnly || !localCfg) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${targetUrl}/config`, {
        method: "POST",
        credentials: 'include',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localCfg),
      });
      if (res.ok) {
        setConfig(localCfg);
        showToast("Admin settings saved!", "success");
      } else {
        showToast("Save failed", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Network error", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Convenience: mutate a deep-cloned copy of localCfg
  const patch = (updater) => setLocalCfg((prev) => {
    const next = deepClone(prev);
    updater(next);
    return next;
  });

  // ---------------------------------------------------------------------------
  // Loading / error states
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin mb-4 text-indigo-600" />
        <p className="font-medium">Loading configuration…</p>
      </div>
    );
  }

  if (!localCfg) {
    return (
      <div className="m-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
        <AlertCircle className="h-5 w-5" />
        <p className="font-medium">Could not load configuration from gateway.</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Derived slices
  // ---------------------------------------------------------------------------
  const admin      = localCfg.adminSettings ?? {};
  const mailBody   = admin.mailBody ?? {};
  const rs485      = admin.rs485Ports ?? [];
  const engUnits   = admin.engineeringUnits ?? [];
  const smtp       = localCfg.smtp ?? {};
  const analog     = localCfg.ioSettings?.analog ?? {};
  const digital    = localCfg.ioSettings?.digitalInput ?? {};
  const plcConfigs = localCfg.plc_configurations ?? [];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-0">

      {/* Page header */}
      <div className="flex items-center justify-between mb-5 p-5">
        <div>
          <h2 className="text-xl font-semibold text-slate-700">Admin Settings</h2>
          <p className="text-xs text-slate-400 mt-0.5">System-level configuration and defaults</p>
        </div>
        <button
          disabled={isReadOnly || isSaving}
          onClick={save}
          className="inline-flex items-center gap-2 px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
      </div>

      {/* Main tab strip */}
      <div className="flex border-b border-slate-200 mb-5">
        {MAIN_TABS.map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === t
                ? "border-zinc-700 text-zinc-800"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {t.replace("_", " ").toUpperCase()}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">

        {/* ── ANALOG ─────────────────────────────────────────────────────── */}
        {activeTab === "analog" && (
          <>
            <h3 className="text-sm font-semibold text-slate-700 pb-3 border-b border-slate-100">Analog</h3>
            <RandomCheckbox
              label="Generate Random Values"
              checked={analog.generate_random}
              disabled={isReadOnly}
              onChange={(v) => patch((c) => { c.ioSettings.analog.generate_random = v; })}
            />
            <MailBodyEditor
              value={mailBody.analog ?? ""}
              disabled={isReadOnly}
              onChange={(v) => patch((c) => { c.adminSettings.mailBody.analog = v; })}
            />
          </>
        )}

        {/* ── DIGITAL ────────────────────────────────────────────────────── */}
        {activeTab === "digital" && (
          <>
            <h3 className="text-sm font-semibold text-slate-700 pb-3 border-b border-slate-100">Digital</h3>
            <RandomCheckbox
              label="Generate Random Values"
              checked={digital.generate_random}
              disabled={isReadOnly}
              onChange={(v) => patch((c) => { c.ioSettings.digitalInput.generate_random = v; })}
            />
            <MailBodyEditor
              value={mailBody.digital ?? ""}
              disabled={isReadOnly}
              onChange={(v) => patch((c) => { c.adminSettings.mailBody.digital = v; })}
            />
          </>
        )}

        {/* ── MODBUS RTU ─────────────────────────────────────────────────── */}
        {activeTab === "modbus_rtu" && (
          <div className="space-y-5">
            <h3 className="text-sm font-semibold text-slate-700 pb-3 border-b border-slate-100">Modbus RTU</h3>

            {/* Sub-tab strip */}
            <div className="flex flex-wrap gap-2">
              {RTU_SUBTABS.map((s) => (
                <button key={s.key} onClick={() => setRtuSubTab(s.key)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    rtuSubTab === s.key
                      ? "bg-zinc-800 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Mail body */}
            {rtuSubTab === "mail" && (
              <MailBodyEditor
                value={mailBody.modbus_rtu ?? ""}
                disabled={isReadOnly}
                onChange={(v) => patch((c) => { c.adminSettings.mailBody.modbus_rtu = v; })}
              />
            )}

            {/* RS485 ports */}
            {rtuSubTab === "rs485" && (
              <div className="space-y-4">
                <span className={lbl}>RS485 Ports</span>
                {rs485.length === 0 && (
                  <p className="text-xs text-slate-400 italic">No RS485 ports added yet.</p>
                )}
                <div className="space-y-2">
                  {rs485.map((p, i) => (
                    <div key={i} className="grid gap-3 items-end rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                      style={{ gridTemplateColumns: "1fr 1fr auto" }}>
                      <div>
                        <label className={lbl}>Port Name</label>
                        <input value={p.name ?? ""} placeholder="Display name" disabled={isReadOnly}
                          onChange={(e) => patch((c) => { c.adminSettings.rs485Ports[i].name = e.target.value; })}
                          className={inp} />
                      </div>
                      <div>
                        <label className={lbl}>Device Path</label>
                        <input value={p.port ?? ""} placeholder="/dev/ttyAMA5" disabled={isReadOnly}
                          onChange={(e) => patch((c) => { c.adminSettings.rs485Ports[i].port = e.target.value; })}
                          className={inp} />
                      </div>
                      <button type="button" disabled={isReadOnly}
                        onClick={() => patch((c) => { c.adminSettings.rs485Ports.splice(i, 1); })}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" disabled={isReadOnly}
                  onClick={() => patch((c) => { c.adminSettings.rs485Ports.push({ name: "", port: "" }); })}
                  className="w-full py-2 border border-dashed border-slate-300 rounded-xl text-xs font-semibold text-slate-500 hover:border-zinc-400 hover:text-zinc-700 hover:bg-white transition-colors disabled:opacity-50">
                  + Add RS485 Port
                </button>
              </div>
            )}

            {/* Engineering units */}
            {rtuSubTab === "engineering" && (
              <div className="space-y-4">
                <span className={lbl}>Sensor Type → Symbol Mappings</span>
                {engUnits.length === 0 && (
                  <p className="text-xs text-slate-400 italic">No engineering units defined.</p>
                )}
                <div className="space-y-2">
                  {engUnits.map((row, i) => (
                    <div key={i} className="grid gap-3 items-end rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                      style={{ gridTemplateColumns: "1fr 1fr auto" }}>
                      <div>
                        <label className={lbl}>Sensor Type</label>
                        <input value={row.type ?? ""} placeholder="e.g. temperature" disabled={isReadOnly}
                          onChange={(e) => patch((c) => { c.adminSettings.engineeringUnits[i].type = e.target.value; })}
                          className={inp} />
                      </div>
                      <div>
                        <label className={lbl}>Symbols (comma-separated)</label>
                        <input value={(row.symbols ?? []).join(",")} placeholder="e.g. °C,°F" disabled={isReadOnly}
                          onChange={(e) => patch((c) => {
                            c.adminSettings.engineeringUnits[i].symbols =
                              e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                          })}
                          className={inp} />
                      </div>
                      <button type="button" disabled={isReadOnly}
                        onClick={() => patch((c) => { c.adminSettings.engineeringUnits.splice(i, 1); })}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" disabled={isReadOnly}
                  onClick={() => patch((c) => { c.adminSettings.engineeringUnits.push({ type: "", symbols: [] }); })}
                  className="w-full py-2 border border-dashed border-slate-300 rounded-xl text-xs font-semibold text-slate-500 hover:border-zinc-400 hover:text-zinc-700 hover:bg-white transition-colors disabled:opacity-50">
                  + Add Sensor Type
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── PLC ────────────────────────────────────────────────────────── */}
        {activeTab === "Modbus TCP" && (
          <>
            <h3 className="text-sm font-semibold text-slate-700 pb-3 border-b border-slate-100">Modbus TCP Configuration</h3>
            <div className="space-y-3">
              <span className={lbl}>Generate Random Values</span>
              {plcConfigs.length === 0 && (
                <p className="text-xs text-slate-400 italic">No PLC configurations found.</p>
              )}
              {plcConfigs.map((plc, i) => (
                <RandomCheckbox
                  key={i}
                  label={`${plc.plcType || "Unknown"} PLC #${i + 1}${plc.PLC?.cred?.ip ? ` — ${plc.PLC.cred.ip}` : ""}`}
                  checked={plc.generate_random}
                  disabled={isReadOnly}
                  onChange={(v) => patch((c) => { c.plc_configurations[i].generate_random = v; })}
                />
              ))}
            </div>
            <MailBodyEditor
              value={mailBody.plc ?? ""}
              disabled={isReadOnly}
              onChange={(v) => patch((c) => { c.adminSettings.mailBody.plc = v; })}
            />
          </>
        )}

        {/* ── SMTP ───────────────────────────────────────────────────────── */}
        {activeTab === "smtp" && (
          <>
            <h3 className="text-sm font-semibold text-slate-700 pb-3 border-b border-slate-100">SMTP Configuration</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "Server",   field: "server",   type: "text",     placeholder: "smtp.example.com" },
                { label: "Port",     field: "port",     type: "number",   placeholder: "587" },
                { label: "User",     field: "user",     type: "text",     placeholder: "user@example.com" },
                { label: "Password", field: "password", type: "password", placeholder: "••••••••" },
              ].map(({ label, field, type, placeholder }) => (
                <div key={field}>
                  <label className={lbl}>{label}</label>
                  <input
                    type={type}
                    value={smtp[field] ?? ""}
                    placeholder={placeholder}
                    disabled={isReadOnly}
                    onChange={(e) => patch((c) => {
                      c.smtp ??= {};
                      c.smtp[field] = type === "number" ? Number(e.target.value) : e.target.value;
                    })}
                    className={inp}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              SMTP settings are transport-level configuration only.
            </p>
          </>
        )}

      </div>
    </div>
  );
}
