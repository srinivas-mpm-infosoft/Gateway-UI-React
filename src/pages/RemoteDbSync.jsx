import React, { useState, useEffect } from "react";
import {
  Plus, Trash2, Save, Loader2, Database, Cloud, Server,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { targetUrl } from "../config";
import { useToast } from "../components/ToastContext";

const inp =
  "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 text-slate-700 disabled:bg-slate-50 disabled:text-slate-400";
const inpErr =
  "w-full border border-red-400 bg-red-50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-400 text-slate-700";
const LABEL = "text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block";

const DEST_CONFIG = [
  { key: "local_db",      label: "Local DB",           icon: Database, color: "indigo" },
  { key: "sandman_local", label: "Sandman Local Cloud", icon: Cloud,    color: "sky"    },
  { key: "sandman_prod",  label: "Sandman Production",  icon: Server,   color: "violet" },
];

const COLOR_MAP = {
  indigo: { ring: "#6366f1", bg: "#eef2ff", text: "#4338ca", border: "#c7d2fe" },
  sky:    { ring: "#0ea5e9", bg: "#f0f9ff", text: "#0369a1", border: "#bae6fd" },
  violet: { ring: "#8b5cf6", bg: "#f5f3ff", text: "#6d28d9", border: "#ddd6fe" },
};

function normalizeSandmanDest(d) {
  return {
    enabled:    d?.enabled    ?? false,
    host:       d?.host       ?? "",
    port:       d?.port       ?? 1433,
    username:   d?.username   ?? "",
    password:   d?.password   ?? "",
    database:   d?.database   ?? "",
    table_name: d?.table_name ?? "",
  };
}

// Local DB destination — only stores enabled / database override / table_name.
// Connection details (host, port, user, password) always come from config.Database.local.cred at display time.
function normalizeLocalDest(d) {
  return {
    enabled:    d?.enabled    ?? false,
    database:   d?.database   ?? "",
    table_name: d?.table_name ?? "",
  };
}

function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function normalizeSource(s) {
  return {
    id:        s.id        ?? generateId(),
    name:      s.name      ?? "",
    enabled:   s.enabled   ?? true,
    collapsed: s.collapsed ?? false,
    host:       s.host       ?? "",
    username:   s.username   ?? "",
    password:   s.password   ?? "",
    database:   s.database   ?? "",
    table_name:            s.table_name            ?? "",
    polling_interval:      s.polling_interval      ?? 60,
    polling_interval_unit: s.polling_interval_unit ?? "sec",
    destinations: {
      local_db:      normalizeLocalDest(s.destinations?.local_db),
      sandman_local: normalizeSandmanDest(s.destinations?.sandman_local),
      sandman_prod:  normalizeSandmanDest(s.destinations?.sandman_prod),
    },
  };
}

function blankSource() {
  return normalizeSource({ id: generateId() });
}

function validateSources(sources) {
  const errs = {};
  sources.forEach((src, si) => {
    if (!src.enabled) return;
    if (!src.host.trim())       errs[`${si}.host`]       = true;
    if (!src.username.trim())   errs[`${si}.username`]   = true;
    if (!src.password.trim())   errs[`${si}.password`]   = true;
    if (!src.database.trim())   errs[`${si}.database`]   = true;
    if (!src.table_name.trim()) errs[`${si}.table_name`] = true;
    ["sandman_local", "sandman_prod"].forEach((dk) => {
      const d = src.destinations[dk];
      if (!d.enabled) return;
      if (!d.host.trim())     errs[`${si}.${dk}.host`]     = true;
      if (!d.username.trim()) errs[`${si}.${dk}.username`] = true;
      if (!d.password.trim()) errs[`${si}.${dk}.password`] = true;
      if (!d.database.trim()) errs[`${si}.${dk}.database`] = true;
    });
  });
  return errs;
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only peer" checked={checked} disabled={disabled}
        onChange={(e) => onChange(e.target.checked)} />
      <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4 peer-focus:ring-2 peer-focus:ring-indigo-200" />
    </label>
  );
}

// Local DB card — connection fields always sourced live from config.Database.local.cred (never stored).
// Only enabled / database (optional override) / table_name are stored in local_db.
function LocalDbCard({ dest, localDbCfg, sourceTableName, onChange, isReadOnly }) {
  const colors = COLOR_MAP.indigo;
  const cred   = localDbCfg?.cred ?? {};

  return (
    <div className="rounded-xl border-2 flex flex-col transition-all"
      style={{
        borderColor: dest.enabled ? colors.ring : "#e2e8f0",
        background:  dest.enabled ? colors.bg   : "#f8fafc",
        opacity:     dest.enabled ? 1 : 0.65,
      }}>
      <div className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: dest.enabled ? colors.border : "#e2e8f0" }}>
        <div className="flex items-center gap-2">
          <Database size={14} style={{ color: dest.enabled ? colors.ring : "#94a3b8" }} />
          <span className="text-xs font-bold" style={{ color: dest.enabled ? colors.text : "#94a3b8" }}>
            Local DB
          </span>
        </div>
        <Toggle checked={dest.enabled} onChange={(v) => onChange("enabled", v)} disabled={isReadOnly} />
      </div>

      <div className="p-4 flex flex-col gap-2.5">
        {/* Connection fields — display-only from config.Database.local.cred, never stored in local_db */}
        <div>
          <label className={LABEL}>Host / IP Address</label>
          <input type="text" disabled value={cred.host ?? ""} className={inp} />
        </div>
        <div>
          <label className={LABEL}>Port</label>
          <input type="text" disabled value={cred.port ?? ""} className={inp} />
        </div>
        <div>
          <label className={LABEL}>Username</label>
          <input type="text" disabled value={cred.user ?? ""} className={inp} />
        </div>
        <div>
          <label className={LABEL}>Password</label>
          <input type="password" disabled value={cred.password ?? ""} className={inp} />
        </div>

        {/* Database — optional override stored in local_db; if blank, uses config database */}
        <div>
          <label className={LABEL}>
            Database{" "}
            <span className="normal-case text-slate-300 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={dest.database}
            disabled={!dest.enabled || isReadOnly}
            placeholder={cred.database ? `Default: ${cred.database}` : "same as config database"}
            onChange={(e) => onChange("database", e.target.value)}
            className={inp}
          />
        </div>

        <div>
          <label className={LABEL}>
            Table Name{" "}
            <span className="normal-case text-slate-300 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={dest.table_name}
            disabled={!dest.enabled || isReadOnly}
            placeholder={sourceTableName || "same as source table"}
            onChange={(e) => onChange("table_name", e.target.value)}
            className={inp}
          />
        </div>
      </div>
    </div>
  );
}

function SandmanCard({ destKey, dest, sourceTableName, errors = {}, onChange, isReadOnly }) {
  const cfg      = DEST_CONFIG.find((d) => d.key === destKey);
  const colors   = COLOR_MAP[cfg.color];
  const Icon     = cfg.icon;
  const disabled = !dest.enabled || isReadOnly;
  const c        = (f) => (errors[f] && dest.enabled ? inpErr : inp);

  return (
    <div className="rounded-xl border-2 flex flex-col transition-all"
      style={{
        borderColor: dest.enabled ? colors.ring : "#e2e8f0",
        background:  dest.enabled ? colors.bg   : "#f8fafc",
        opacity:     dest.enabled ? 1 : 0.65,
      }}>
      <div className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: dest.enabled ? colors.border : "#e2e8f0" }}>
        <div className="flex items-center gap-2">
          <Icon size={14} style={{ color: dest.enabled ? colors.ring : "#94a3b8" }} />
          <span className="text-xs font-bold" style={{ color: dest.enabled ? colors.text : "#94a3b8" }}>
            {cfg.label}
          </span>
        </div>
        <Toggle checked={dest.enabled} onChange={(v) => onChange("enabled", v)} disabled={isReadOnly} />
      </div>

      <div className="p-4 flex flex-col gap-2.5">
        <div>
          <label className={LABEL}>
            Host / IP Address{dest.enabled && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          <input type="text" value={dest.host} disabled={disabled} placeholder="192.168.1.100"
            onChange={(e) => onChange("host", e.target.value)} className={c("host")} />
        </div>
        <div>
          <label className={LABEL}>Port</label>
          <input type="number" value={dest.port ?? 1433} disabled={disabled}
            onChange={(e) => onChange("port", Number(e.target.value) || 1433)} className={inp} />
        </div>
        <div>
          <label className={LABEL}>
            Username{dest.enabled && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          <input type="text" value={dest.username} disabled={disabled} placeholder="sa"
            onChange={(e) => onChange("username", e.target.value)} className={c("username")} />
        </div>
        <div>
          <label className={LABEL}>
            Password{dest.enabled && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          <input type="password" value={dest.password} disabled={disabled}
            onChange={(e) => onChange("password", e.target.value)} className={c("password")} />
        </div>
        <div>
          <label className={LABEL}>
            Database{dest.enabled && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          <input type="text" value={dest.database} disabled={disabled} placeholder="target_db"
            onChange={(e) => onChange("database", e.target.value)} className={c("database")} />
        </div>
        <div>
          <label className={LABEL}>
            Table Name{" "}
            <span className="normal-case text-slate-300 font-normal">(optional)</span>
          </label>
          <input type="text" value={dest.table_name} disabled={disabled}
            placeholder={sourceTableName || "same as source table"}
            onChange={(e) => onChange("table_name", e.target.value)} className={inp} />
        </div>
      </div>
    </div>
  );
}

function SourceCard({ source, index, localDbCfg, errors = {}, onChange, onRemove, isReadOnly }) {
  // Change 1: no local useState — use source.collapsed so state persists in config.json
  const setField = (k, v) => onChange({ ...source, [k]: v });
  const setDest  = (destKey, field, value) =>
    onChange({
      ...source,
      destinations: {
        ...source.destinations,
        [destKey]: { ...source.destinations[destKey], [field]: value },
      },
    });

  const srcErr   = (f) => !!errors[f];
  const destErrors = (dk) =>
    Object.fromEntries(
      Object.entries(errors)
        .filter(([k]) => k.startsWith(`${dk}.`))
        .map(([k, v]) => [k.slice(dk.length + 1), v])
    );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-visible">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <Toggle checked={source.enabled} onChange={(v) => setField("enabled", v)} disabled={isReadOnly} />
          <div>
            <p className="text-sm font-semibold text-slate-700">
              {source.name || `Remote MSSQL ${index + 1}`}
              {source.host && (
                <span className="text-slate-400 font-normal ml-2 text-xs">{source.host}</span>
              )}
            </p>
            <p className="text-[11px] text-slate-400">Port 1433 (fixed)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isReadOnly && (
            <button type="button" onClick={onRemove}
              className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
              title="Remove source">
              <Trash2 size={14} />
            </button>
          )}
          {/* Change 1: toggle writes into source object via onChange */}
          <button type="button"
            onClick={() => onChange({ ...source, collapsed: !source.collapsed })}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            {source.collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {!source.collapsed && (
        <div className="px-5 py-5 space-y-6">
          {/* Source connection fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={LABEL}>
                Name / Label{" "}
                <span className="normal-case text-slate-300 font-normal">(optional)</span>
              </label>
              <input type="text" value={source.name} disabled={isReadOnly}
                placeholder={`Remote MSSQL ${index + 1}`}
                onChange={(e) => setField("name", e.target.value)} className={inp} />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className={LABEL}>
                Host / IP Address<span className="text-red-500 ml-0.5">*</span>
              </label>
              <input type="text" value={source.host} disabled={isReadOnly}
                placeholder="192.168.1.100"
                onChange={(e) => setField("host", e.target.value)}
                className={srcErr("host") ? inpErr : inp} />
              {srcErr("host") && <p className="text-red-500 text-[10px] mt-0.5">Required</p>}
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className={LABEL}>Port</label>
              <input type="text" value="1433" disabled className={inp} />
            </div>

            <div>
              <label className={LABEL}>
                Username<span className="text-red-500 ml-0.5">*</span>
              </label>
              <input type="text" value={source.username} disabled={isReadOnly} placeholder="sa"
                onChange={(e) => setField("username", e.target.value)}
                className={srcErr("username") ? inpErr : inp} />
              {srcErr("username") && <p className="text-red-500 text-[10px] mt-0.5">Required</p>}
            </div>

            <div>
              <label className={LABEL}>
                Password<span className="text-red-500 ml-0.5">*</span>
              </label>
              <input type="password" value={source.password} disabled={isReadOnly}
                onChange={(e) => setField("password", e.target.value)}
                className={srcErr("password") ? inpErr : inp} />
              {srcErr("password") && <p className="text-red-500 text-[10px] mt-0.5">Required</p>}
            </div>

            <div>
              <label className={LABEL}>
                Database<span className="text-red-500 ml-0.5">*</span>
              </label>
              <input type="text" value={source.database} disabled={isReadOnly}
                placeholder="production_db"
                onChange={(e) => setField("database", e.target.value)}
                className={srcErr("database") ? inpErr : inp} />
              {srcErr("database") && <p className="text-red-500 text-[10px] mt-0.5">Required</p>}
            </div>

            <div>
              <label className={LABEL}>
                Table Name<span className="text-red-500 ml-0.5">*</span>
              </label>
              <input type="text" value={source.table_name} disabled={isReadOnly}
                placeholder="sensor_readings"
                onChange={(e) => setField("table_name", e.target.value)}
                className={srcErr("table_name") ? inpErr : inp} />
              {srcErr("table_name") && <p className="text-red-500 text-[10px] mt-0.5">Required</p>}
            </div>

            <div className="col-span-2">
              <label className={LABEL}>Polling Interval</label>
              <div className="flex items-center gap-2">
                <input type="number" min="1"
                  value={source.polling_interval ?? 60}
                  disabled={isReadOnly}
                  onChange={(e) => setField("polling_interval", Number(e.target.value) || 1)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 text-slate-700 w-28 disabled:bg-slate-50 disabled:text-slate-400" />
                <select
                  value={source.polling_interval_unit ?? "sec"}
                  disabled={isReadOnly}
                  onChange={(e) => setField("polling_interval_unit", e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 text-slate-700 w-24 disabled:bg-slate-50 disabled:text-slate-400">
                  <option value="sec">Sec</option>
                  <option value="min">Min</option>
                  <option value="hour">Hour</option>
                </select>
              </div>
            </div>
          </div>

          {/* Destinations */}
          <div>
            {/* Change 3: thicker, more visible connector lines */}
            <div className="relative h-11 hidden sm:block">
              {/* Vertical stem */}
              <div className="absolute bg-slate-400"
                style={{ width: 2, left: "50%", transform: "translateX(-50%)", top: 0, height: 24 }} />
              {/* Horizontal bar */}
              <div className="absolute bg-slate-400"
                style={{ height: 2, left: "16.5%", right: "16.5%", top: 24 }} />
              {/* Drops to each card */}
              {[0, 1, 2].map((i) => (
                <div key={i} className="absolute bg-slate-400"
                  style={{ width: 2, left: `calc(${16.5 + i * 33.5}% - 1px)`, top: 24, height: 20 }} />
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <LocalDbCard
                dest={source.destinations.local_db}
                localDbCfg={localDbCfg}
                sourceTableName={source.table_name}
                onChange={(f, v) => setDest("local_db", f, v)}
                isReadOnly={isReadOnly}
              />
              <SandmanCard
                destKey="sandman_local"
                dest={source.destinations.sandman_local}
                sourceTableName={source.table_name}
                errors={destErrors("sandman_local")}
                onChange={(f, v) => setDest("sandman_local", f, v)}
                isReadOnly={isReadOnly}
              />
              <SandmanCard
                destKey="sandman_prod"
                dest={source.destinations.sandman_prod}
                sourceTableName={source.table_name}
                errors={destErrors("sandman_prod")}
                onChange={(f, v) => setDest("sandman_prod", f, v)}
                isReadOnly={isReadOnly}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const SUB_TABS = [{ id: "mssql", label: "MSSQL" }];

export default function RemoteDbSync({ subTab = "mssql", isReadOnly = false }) {
  const showToast = useToast();
  const [fullConfig, setFullConfig]       = useState(null);
  const [localDbCfg, setLocalDbCfg]       = useState(null);
  const [sources,    setSources]          = useState([blankSource()]);
  const [activeSourceIdx, setActiveSourceIdx] = useState(0);
  const [loading,    setLoading]          = useState(true);
  const [saving,     setSaving]           = useState(false);
  const [errors,     setErrors]           = useState({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${targetUrl}/config`, { credentials: "include" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const cfg  = await res.json();
        if (cancelled) return;

        setFullConfig(cfg);
        setLocalDbCfg(cfg?.Database?.local ?? null);

        const raw = Array.isArray(cfg?.remote_db_sync?.mssql) ? cfg.remote_db_sync.mssql : [];
        setSources(raw.length > 0 ? raw.map(normalizeSource) : [blankSource()]);
      } catch (err) {
        if (!cancelled) {
          console.error("RemoteDbSync load:", err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const addSource = () => {
    setSources((p) => {
      const next = [...(p ?? []), blankSource()];
      setActiveSourceIdx(next.length - 1);
      return next;
    });
  };

  const updateSource = (idx, updated) =>
    setSources((p) => (p ?? []).map((s, i) => (i === idx ? updated : s)));

  const removeSource = (idx) => {
    if (!window.confirm("Remove this remote database source?")) return;
    setSources((p) => {
      const next = (p ?? []).filter((_, i) => i !== idx);
      setActiveSourceIdx((cur) => Math.min(cur, Math.max(0, next.length - 1)));
      return next;
    });
  };

  const save = async () => {
    if (!fullConfig || !sources) return;
    const errs = validateSources(sources);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      showToast("Please fill in all required fields", "error");
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const updated = {
        ...fullConfig,
        remote_db_sync: { ...(fullConfig.remote_db_sync ?? {}), mssql: sources },
      };
      const res = await fetch(`${targetUrl}/config`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        setFullConfig(updated);
        showToast("Remote DB Sync configuration saved!", "success");
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || "Failed to save", "error");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Remote DB Sync</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Pull data from remote databases into your gateway's local or cloud storage.
          </p>
        </div>
        <button onClick={save} disabled={saving || isReadOnly}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg transition-colors shadow-sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving…" : "Save Configuration"}
        </button>
      </div>

      {/* Loading banner */}
      {loading && (
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading saved configuration…</span>
        </div>
      )}

      {/* Sub-tab */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit border border-slate-200">
        {SUB_TABS.map((t) => (
          <span key={t.id}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
              subTab === t.id ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
            }`}>
            {t.label}
          </span>
        ))}
      </div>

      {/* Source tabs + form */}
      {subTab === "mssql" && (
        <div className="space-y-4">

          {/* Horizontal source tabs */}
          <div className="flex items-center gap-1 flex-wrap">
            {sources.map((src, idx) => (
              <button
                key={src.id}
                type="button"
                onClick={() => setActiveSourceIdx(idx)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                  activeSourceIdx === idx
                    ? "bg-zinc-800 text-white border-zinc-800"
                    : "bg-white text-slate-500 border-slate-200 hover:border-zinc-400 hover:text-zinc-700"
                }`}
              >
                {src.name || `MSSQL ${idx + 1}`}
              </button>
            ))}
            {!isReadOnly && (
              <button type="button" onClick={addSource}
                className="px-3 py-1.5 rounded-md text-xs font-medium border border-dashed border-slate-300 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors flex items-center gap-1">
                <Plus size={12} />
                Add Source
              </button>
            )}
          </div>

          {/* Active source form */}
          {sources.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-2xl">
              No remote MSSQL sources configured. Click &quot;+ Add Source&quot; to get started.
            </div>
          ) : (() => {
            const idx = activeSourceIdx < sources.length ? activeSourceIdx : 0;
            const src = sources[idx];
            const srcErrors = Object.fromEntries(
              Object.entries(errors)
                .filter(([k]) => k.startsWith(`${idx}.`))
                .map(([k, v]) => [k.slice(String(idx).length + 1), v])
            );
            return (
              <SourceCard
                key={src.id}
                source={src}
                index={idx}
                localDbCfg={localDbCfg}
                errors={srcErrors}
                onChange={(updated) => updateSource(idx, updated)}
                onRemove={() => removeSource(idx)}
                isReadOnly={isReadOnly}
              />
            );
          })()}
        </div>
      )}
    </div>
  );
}
