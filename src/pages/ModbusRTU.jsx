import React, { useEffect, useState } from "react";
import { Pencil, X, Settings } from "lucide-react";
import { useToast } from "../components/ToastContext";
import DBSettings from "./DBSettings";
import RegisterTable from "./modbus/RegisterTable";
import PresetsPanel from "./modbus/PresetsPanel";

// ---------------------------------------------------------------------------
// Built-in schemas
// ---------------------------------------------------------------------------
const BUILT_IN_SCHEMAS = {
  schneider_em6436h: { label: "Schneider EM6436H", rows: [] },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function deepClone(v) { return JSON.parse(JSON.stringify(v)); }
function slugify(s) { return s.toLowerCase().replace(/\W+/g, "_") || `preset_${Date.now()}`; }

function ensureBase(cfg) {
  const next = { ...(cfg || {}) };
  next.ModbusRTU = next.ModbusRTU || {};
  next.ModbusRTU.Devices = next.ModbusRTU.Devices || { brands: {}, order: [], globalPresets: {} };
  next.ModbusRTU.Devices.globalPresets = next.ModbusRTU.Devices.globalPresets || {};
  next.ModbusRTU.settings = next.ModbusRTU.settings || { baudRate: "9600", parity: "Even", dataBits: 8, stopBits: 1 };
  next.plc_configurations = next.plc_configurations || [];
  next.ModbusRTU.transmitters = next.ModbusRTU.transmitters || [];
  return next;
}

function normalizeSlave(s) {
  return {
    id: Number(s.id),
    enabled: s.enabled ?? true,
    rs485_port: s.rs485_port ?? "/dev/ttyAMA5",
    baudRate: s.baudRate ?? 9600,
    parity: s.parity ?? "Even",
    dataBits: s.dataBits ?? 8,
    stopBits: s.stopBits ?? 1,
    pollingInterval: s.pollingInterval ?? 5,
    pollingIntervalUnit: s.pollingIntervalUnit ?? "Sec",
    use_usb: s.use_usb ?? false,
    upload_local: s.upload_local ?? true,
    upload_cloud: s.upload_cloud ?? false,
    db_name: s.db_name ?? "",
    table_name: s.table_name ?? "",
  };
}

function normalizeRegisterRow(r) {
  return {
    name: r.name ?? "",
    start: r.start ?? "",
    offset: r.offset ?? 0,
    type: r.type ?? "Input Register",
    conversion: r.conversion ?? "Float: Big Endian",
    sql_type: r.sql_type ?? "FLOAT",
    length: r.length ?? 2,
    multiply: r.multiply ?? 1,
    divide: r.divide ?? 1,
    process_min: r.process_min ?? "",
    process_max: r.process_max ?? "",
    sensor_type: r.sensor_type ?? "",
    eng_symbol: r.eng_symbol ?? "",
    eng_unit: r.eng_unit ?? "4-20mA",
    enable_setpoint: !!r.enable_setpoint,
    read: !!r.read,
    write: !!r.write,
    // Alert settings stored as a nested object (migrate from legacy flat fields)
    alert: {
      enabled: !!(r.alert?.enabled ?? r.alert_enabled),
      lower_limit: r.alert?.lower_limit ?? r.alert_lower_limit ?? r.lower_limit ?? "",
      upper_limit: r.alert?.upper_limit ?? r.alert_upper_limit ?? r.upper_limit ?? "",
      email: r.alert?.email ?? r.alert_email ?? "",
      mobile: r.alert?.mobile ?? r.alert_mobile ?? "",
      message: r.alert?.message ?? r.alert_message ?? "",
      do_pin: r.alert?.do_pin ?? r.alert_do_pin ?? r.do_pin ?? "",
      do_status: r.alert?.do_status ?? r.alert_do_status ?? r.do_status ?? "High",
    },
  };
}

function getAllUsedSlaveIds(brands) {
  const ids = new Set();
  Object.values(brands || {}).forEach((b) =>
    (b.slaves || []).forEach((s) => ids.add(Number(s.id)))
  );
  return ids;
}

function suggestNextSlaveId(brands) {
  const used = getAllUsedSlaveIds(brands);
  for (let i = 1; i <= 247; i++) if (!used.has(i)) return i;
  return null;
}

// ---------------------------------------------------------------------------
// Small reusable modal wrapper
// ---------------------------------------------------------------------------
function Modal({ title, onClose, children, width = 460 }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col"
        style={{ width, maxHeight: "90vh" }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-700 text-sm">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function ModbusRTU({ config, onSave, setConfig, role = "admin", isReadOnly }) {
  const showToast = useToast();

  const [localCfg, setLocalCfg] = useState(() => ensureBase(config));
  const [activeTopTab, setActiveTopTab] = useState("Devices");
  const [activeBrandKey, setActiveBrandKey] = useState(null);
  const [activeSlaveId, setActiveSlaveId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Modals
  const [slaveRTUModal, setSlaveRTUModal] = useState({ open: false, data: {} });
  const [renameModal, setRenameModal] = useState({ open: false, slaveId: null, newId: "" });
  const [brandModal, setBrandModal] = useState({ open: false, name: "" });
  const [alertModal, setAlertModal] = useState({ open: false, rowIdx: -1, data: {} });
  const [presetEditModal, setPresetEditModal] = useState({ open: false, pid: null, scope: null, name: "", rows: [] });

  const isSuperAdmin = role === "superadmin";

  useEffect(() => {
    const next = ensureBase(config);
    if (!next.ModbusRTU.Devices.order.length) {
      const key = "schneider_em6436h";
      next.ModbusRTU.Devices.brands[key] = { label: "Schneider EM6436H", slaves: [], registersBySlave: {}, presets: {} };
      next.ModbusRTU.Devices.order = [key];
    }
    setLocalCfg(next);
    const firstKey = next.ModbusRTU.Devices.order[0];
    setActiveBrandKey(firstKey);
    setActiveSlaveId(next.ModbusRTU.Devices.brands[firstKey]?.slaves?.[0]?.id ?? null);
  }, [config]);

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------
  const save = async () => {
    if (isReadOnly) return;
    setIsSaving(true);
    try {
      await onSave(localCfg);
      setConfig?.(localCfg);
      showToast("Modbus RTU settings saved!", "success");
    } catch (err) {
      console.error(err);
      showToast("Save failed", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // RTU Global Settings
  // ---------------------------------------------------------------------------
  const updateRTUSetting = (key, value) => {
    if (isReadOnly) return;
    setLocalCfg((prev) => { const next = deepClone(prev); next.ModbusRTU.settings[key] = value; return next; });
  };

  // ---------------------------------------------------------------------------
  // Brand management
  // ---------------------------------------------------------------------------
  const addBrand = (label) => {
    if (isReadOnly || !label) return;
    const key = label.toLowerCase().replace(/\W+/g, "_") || `brand_${Date.now()}`;
    setLocalCfg((prev) => {
      const next = deepClone(prev);
      if (!next.ModbusRTU.Devices.brands[key]) {
        next.ModbusRTU.Devices.brands[key] = { label, slaves: [], registersBySlave: {}, presets: {} };
      } else {
        next.ModbusRTU.Devices.brands[key].label = label;
      }
      if (!next.ModbusRTU.Devices.order.includes(key)) next.ModbusRTU.Devices.order.push(key);
      return next;
    });
    setActiveBrandKey(key);
    setActiveSlaveId(null);
  };

  const removeBrand = (brandKey) => {
    if (isReadOnly) return;
    const label = localCfg.ModbusRTU.Devices.brands[brandKey]?.label || brandKey;
    if (!window.confirm(`Remove device "${label}"? This deletes all slaves and registers.`)) return;
    setLocalCfg((prev) => {
      const next = deepClone(prev);
      delete next.ModbusRTU.Devices.brands[brandKey];
      next.ModbusRTU.Devices.order = next.ModbusRTU.Devices.order.filter((k) => k !== brandKey);
      if (next.alarmSettings?.Modbus?.[brandKey]) delete next.alarmSettings.Modbus[brandKey];
      return next;
    });
    const remaining = localCfg.ModbusRTU.Devices.order.filter((k) => k !== brandKey);
    setActiveBrandKey(remaining[0] ?? null);
    setActiveSlaveId(null);
  };

  // ---------------------------------------------------------------------------
  // Slave management
  // ---------------------------------------------------------------------------
  const addSlave = () => {
    if (isReadOnly || !activeBrandKey) return;
    const nextId = suggestNextSlaveId(localCfg.ModbusRTU.Devices.brands);
    if (!nextId) { showToast("No free slave IDs (1–247)", "error"); return; }
    setLocalCfg((prev) => {
      const next = deepClone(prev);
      const brand = next.ModbusRTU.Devices.brands[activeBrandKey];
      brand.slaves = brand.slaves || [];
      brand.slaves.push(normalizeSlave({ id: nextId }));
      brand.registersBySlave = brand.registersBySlave || {};
      brand.registersBySlave[String(nextId)] = brand.registersBySlave[String(nextId)] || [];
      return next;
    });
    setActiveSlaveId(nextId);
  };

  const removeSlave = (slaveId) => {
    if (isReadOnly || !activeBrandKey) return;
    if (!window.confirm(`Remove slave ${slaveId}?`)) return;
    setLocalCfg((prev) => {
      const next = deepClone(prev);
      const brand = next.ModbusRTU.Devices.brands[activeBrandKey];
      brand.slaves = (brand.slaves || []).filter((s) => String(s.id) !== String(slaveId));
      if (brand.registersBySlave) delete brand.registersBySlave[String(slaveId)];
      return next;
    });
    if (String(activeSlaveId) === String(slaveId)) setActiveSlaveId(null);
  };

  const updateSlave = (field, value) => {
    if (isReadOnly || !activeBrandKey || activeSlaveId == null) return;
    setLocalCfg((prev) => {
      const next = deepClone(prev);
      const brand = next.ModbusRTU.Devices.brands[activeBrandKey];
      const idx = (brand.slaves || []).findIndex((s) => String(s.id) === String(activeSlaveId));
      if (idx < 0) return next;
      brand.slaves[idx] = { ...brand.slaves[idx], [field]: value };
      return next;
    });
  };

  // ---------------------------------------------------------------------------
  // Slave ID rename
  // ---------------------------------------------------------------------------
  const openRenameModal = (slaveId) => {
    setRenameModal({ open: true, slaveId, newId: String(slaveId) });
  };

  const saveRenameModal = () => {
    const { slaveId, newId } = renameModal;
    const n = parseInt(newId, 10);
    if (!Number.isInteger(n) || n < 1 || n > 247) {
      showToast("Slave ID must be between 1 and 247", "error");
      return;
    }
    if (String(n) === String(slaveId)) {
      setRenameModal({ open: false, slaveId: null, newId: "" });
      return;
    }
    const usedIds = getAllUsedSlaveIds(localCfg.ModbusRTU.Devices.brands);
    usedIds.delete(Number(slaveId)); // removing itself so it can "stay"
    if (usedIds.has(n)) {
      showToast(`Slave ID ${n} is already taken`, "error");
      return;
    }
    setLocalCfg((prev) => {
      const next = deepClone(prev);
      const brand = next.ModbusRTU.Devices.brands[activeBrandKey];
      // Update slave id field
      brand.slaves = brand.slaves.map((s) =>
        String(s.id) === String(slaveId) ? { ...s, id: n } : s
      );
      // Migrate registers key
      brand.registersBySlave = brand.registersBySlave || {};
      brand.registersBySlave[String(n)] = brand.registersBySlave[String(slaveId)] || [];
      delete brand.registersBySlave[String(slaveId)];
      // Migrate alarms
      const modAlarms = next.alarmSettings?.Modbus?.[activeBrandKey];
      if (modAlarms?.slaves?.[String(slaveId)]) {
        modAlarms.slaves[String(n)] = modAlarms.slaves[String(slaveId)];
        delete modAlarms.slaves[String(slaveId)];
      }
      return next;
    });
    if (String(activeSlaveId) === String(slaveId)) setActiveSlaveId(n);
    setRenameModal({ open: false, slaveId: null, newId: "" });
    showToast(`Slave ID updated to ${n}`, "success");
  };

  // ---------------------------------------------------------------------------
  // Slave RTU settings modal
  // ---------------------------------------------------------------------------
  const openSlaveRTUModal = (slave) => {
    setSlaveRTUModal({
      open: true,
      data: {
        rs485_port: slave.rs485_port,
        baudRate: slave.baudRate,
        parity: slave.parity,
        dataBits: slave.dataBits,
        stopBits: slave.stopBits,
      },
    });
    setActiveSlaveId(slave.id);
  };

  const saveSlaveRTUModal = () => {
    if (isReadOnly) return;
    setLocalCfg((prev) => {
      const next = deepClone(prev);
      const brand = next.ModbusRTU.Devices.brands[activeBrandKey];
      const idx = (brand.slaves || []).findIndex((s) => String(s.id) === String(activeSlaveId));
      if (idx >= 0) brand.slaves[idx] = { ...brand.slaves[idx], ...slaveRTUModal.data };
      return next;
    });
    setSlaveRTUModal({ open: false, data: {} });
    showToast("Slave RTU settings saved", "success");
  };

  // ---------------------------------------------------------------------------
  // Register management
  // ---------------------------------------------------------------------------
  const updateRegister = (idx, fieldOrObj, value) => {
    if (isReadOnly || !activeBrandKey || activeSlaveId == null) return;
    setLocalCfg((prev) => {
      const next = deepClone(prev);
      const brand = next.ModbusRTU.Devices.brands[activeBrandKey];
      const key = String(activeSlaveId);
      const rows = brand.registersBySlave[key] || [];
      rows[idx] = typeof fieldOrObj === "object"
        ? { ...rows[idx], ...fieldOrObj }
        : { ...rows[idx], [fieldOrObj]: value };
      brand.registersBySlave[key] = rows;
      return next;
    });
  };

  const addRegisterRow = () => {
    if (isReadOnly || !activeBrandKey || activeSlaveId == null) return;
    setLocalCfg((prev) => {
      const next = deepClone(prev);
      const brand = next.ModbusRTU.Devices.brands[activeBrandKey];
      const key = String(activeSlaveId);
      brand.registersBySlave = brand.registersBySlave || {};
      brand.registersBySlave[key] = brand.registersBySlave[key] || [];
      brand.registersBySlave[key].push(normalizeRegisterRow({}));
      return next;
    });
  };

  const removeRegisterRow = (idx) => {
    if (isReadOnly || !activeBrandKey || activeSlaveId == null) return;
    setLocalCfg((prev) => {
      const next = deepClone(prev);
      const brand = next.ModbusRTU.Devices.brands[activeBrandKey];
      const key = String(activeSlaveId);
      brand.registersBySlave[key] = (brand.registersBySlave[key] || []).filter((_, i) => i !== idx);
      return next;
    });
  };

  // ---------------------------------------------------------------------------
  // Alert Settings modal
  // ---------------------------------------------------------------------------
  const openAlertModal = (rowIdx) => {
    const row = rows[rowIdx];
    if (!row) return;
    setAlertModal({
      open: true,
      rowIdx,
      data: { ...(row.alert || {}) },
    });
  };

  const saveAlertModal = () => {
    const { rowIdx, data } = alertModal;
    setLocalCfg((prev) => {
      const next = deepClone(prev);
      const brand = next.ModbusRTU.Devices.brands[activeBrandKey];
      const key = String(activeSlaveId);
      const rowList = brand.registersBySlave[key] || [];
      rowList[rowIdx] = { ...rowList[rowIdx], alert: data };
      brand.registersBySlave[key] = rowList;
      return next;
    });
    setAlertModal({ open: false, rowIdx: -1, data: {} });
    showToast("Alert settings saved", "success");
  };

  // ---------------------------------------------------------------------------
  // Preset management
  // ---------------------------------------------------------------------------
  const loadPreset = (presetRows) => {
    if (isReadOnly || !activeBrandKey || activeSlaveId == null) return;
    setLocalCfg((prev) => {
      const next = deepClone(prev);
      const brand = next.ModbusRTU.Devices.brands[activeBrandKey];
      const key = String(activeSlaveId);
      brand.registersBySlave = brand.registersBySlave || {};
      brand.registersBySlave[key] = presetRows.map(normalizeRegisterRow);
      return next;
    });
  };

  const deletePreset = (pid, scope) => {
    if (isReadOnly) return;
    setLocalCfg((prev) => {
      const next = deepClone(prev);
      if (scope === "global") {
        delete next.ModbusRTU.Devices.globalPresets[pid];
      } else {
        const brand = next.ModbusRTU.Devices.brands[activeBrandKey];
        if (brand?.presets) delete brand.presets[pid];
      }
      return next;
    });
  };


  const savePreset = (name, scope) => {
    if (isReadOnly || !activeBrandKey || activeSlaveId == null) return;
    const pid = slugify(name);
    const rows = deepClone(
      (localCfg.ModbusRTU.Devices.brands[activeBrandKey]?.registersBySlave?.[String(activeSlaveId)] || []).map(normalizeRegisterRow)
    );
    setLocalCfg((prev) => {
      const next = deepClone(prev);
      if (scope === "global") {
        next.ModbusRTU.Devices.globalPresets = next.ModbusRTU.Devices.globalPresets || {};
        next.ModbusRTU.Devices.globalPresets[pid] = { name, rows };
      } else {
        const brand = next.ModbusRTU.Devices.brands[activeBrandKey];
        brand.presets = brand.presets || {};
        brand.presets[pid] = { name, rows };
      }
      return next;
    });
  };

  // ---------------------------------------------------------------------------
  // Preset full editor
  // ---------------------------------------------------------------------------
  const openEditPreset = (pid, scope) => {
    let presetRows = [];
    let presetName = pid;
    if (scope === "global") {
      const p = localCfg.ModbusRTU.Devices.globalPresets?.[pid];
      presetRows = deepClone(p?.rows || []);
      presetName = p?.name || pid;
    } else {
      const p = localCfg.ModbusRTU.Devices.brands[activeBrandKey]?.presets?.[pid];
      presetRows = deepClone(p?.rows || []);
      presetName = p?.name || pid;
    }
    setPresetEditModal({ open: true, pid, scope, name: presetName, rows: presetRows.map(normalizeRegisterRow) });
  };

  const saveEditedPreset = () => {
    const { pid, scope, name, rows } = presetEditModal;
    setLocalCfg((prev) => {
      const next = deepClone(prev);
      if (scope === "global") {
        next.ModbusRTU.Devices.globalPresets[pid] = { name, rows: rows.map(normalizeRegisterRow) };
      } else {
        const brand = next.ModbusRTU.Devices.brands[activeBrandKey];
        if (brand) { brand.presets = brand.presets || {}; brand.presets[pid] = { name, rows: rows.map(normalizeRegisterRow) }; }
      }
      return next;
    });
    setPresetEditModal({ open: false, pid: null, scope: null, name: "", rows: [] });
    showToast("Preset updated", "success");
  };

  const closePresetEditModal = () =>
    setPresetEditModal({ open: false, pid: null, scope: null, name: "", rows: [] });

  const addPresetEditRow = () =>
    setPresetEditModal((m) => ({ ...m, rows: [...m.rows, normalizeRegisterRow({})] }));

  const updatePresetEditRow = (idx, fieldOrObj, value) =>
    setPresetEditModal((m) => {
      const rows = [...m.rows];
      rows[idx] = typeof fieldOrObj === "object"
        ? { ...rows[idx], ...fieldOrObj }
        : { ...rows[idx], [fieldOrObj]: value };
      return { ...m, rows };
    });

  const removePresetEditRow = (idx) =>
    setPresetEditModal((m) => ({ ...m, rows: m.rows.filter((_, i) => i !== idx) }));

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------
  const devices = localCfg.ModbusRTU.Devices;
  const brand = activeBrandKey ? devices.brands[activeBrandKey] : null;
  const slaves = (brand?.slaves || []).map(normalizeSlave);
  const slaveObj = activeSlaveId != null ? slaves.find((s) => String(s.id) === String(activeSlaveId)) : null;
  const rows = (brand?.registersBySlave?.[String(activeSlaveId)] || []).map(normalizeRegisterRow);
  const engConfig = localCfg.adminSettings?.engineeringUnits || [];
  const rs485Ports = localCfg.adminSettings?.rs485Ports || [];
  const builtInSchema = BUILT_IN_SCHEMAS[activeBrandKey] ?? null;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-0">
      {/* ══ Page Header ══ */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold text-slate-700">Modbus RTU</h2>
          <p className="text-xs text-slate-400 mt-0.5">Manage devices, slaves and register maps</p>
        </div>
        <button
          className="inline-flex items-center gap-2 px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
          disabled={isReadOnly || isSaving}
          onClick={save}
        >
          {isSaving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {/* ══ Top tabs ══ */}
      <div className="flex border-b border-slate-200 mb-5">
        {["Devices", "Settings"].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTopTab(t)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTopTab === t
                ? "border-zinc-700 text-zinc-800"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ══ Settings Tab ══ */}
      {activeTopTab === "Settings" && (
        <div className="bg-gray-50 rounded-xl border border-slate-200 p-5">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Global RTU Settings</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Baud Rate", key: "baudRate", options: ["300","600","1200","2400","4800","9600","19200","38400","57600","115200","230400"] },
              { label: "Parity", key: "parity", options: ["Even","Odd","None"] },
              { label: "Data Bits", key: "dataBits", options: [5,6,7,8], isNum: true },
              { label: "Stop Bits", key: "stopBits", options: [1,2], isNum: true },
            ].map(({ label, key, options, isNum }) => (
              <label key={key} className="block">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
                <select
                  value={localCfg.ModbusRTU.settings[key]}
                  disabled={isReadOnly}
                  onChange={(e) => updateRTUSetting(key, isNum ? Number(e.target.value) : e.target.value)}
                  className="mt-1.5 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 text-slate-700"
                >
                  {options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ══ Devices Tab ══ */}
      {activeTopTab === "Devices" && (
        <div className="space-y-4">

          {/* ── Brand strip ── */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Devices</span>
              <button
                disabled={isReadOnly}
                onClick={() => setBrandModal({ open: true, name: "" })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                + Add Device
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {devices.order.length === 0 && (
                <p className="text-sm text-slate-400 italic">No devices yet. Add one above.</p>
              )}
              {devices.order.map((key) => (
                <div
                  key={key}
                  className={`group flex items-center gap-0 rounded-lg border overflow-hidden transition-all ${
                    activeBrandKey === key
                      ? "border-zinc-600 shadow-sm"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <button
                    onClick={() => {
                      setActiveBrandKey(key);
                      setActiveSlaveId(devices.brands[key]?.slaves?.[0]?.id ?? null);
                    }}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      activeBrandKey === key
                        ? "bg-zinc-800 text-white"
                        : "bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {devices.brands[key]?.label || key}
                  </button>
                  <button
                    disabled={isReadOnly}
                    onClick={() => removeBrand(key)}
                    className={`px-2 py-2 text-sm transition-colors ${
                      activeBrandKey === key
                        ? "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-700"
                        : "bg-white text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                    }`}
                    title="Remove device"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ── Slave strip ── */}
          {activeBrandKey && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Slaves — {devices.brands[activeBrandKey]?.label}
                </span>
                <button
                  disabled={isReadOnly}
                  onClick={addSlave}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-600 transition-colors disabled:opacity-50"
                >
                  + Add Slave
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {slaves.length === 0 && (
                  <p className="text-sm text-slate-400 italic">No slaves yet.</p>
                )}
                {slaves.map((s) => {
                  const isActive = String(activeSlaveId) === String(s.id);
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center rounded-lg border overflow-hidden transition-all ${
                        isActive
                          ? "border-zinc-600 shadow-sm"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <button
                        onClick={() => setActiveSlaveId(s.id)}
                        className={`px-3 py-1.5 text-sm font-semibold transition-colors ${
                          isActive ? "bg-zinc-800 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        Slave {s.id}
                      </button>
                      {/* RTU Settings */}
                      <button
                        title="RTU Communication Settings"
                        onClick={() => openSlaveRTUModal(normalizeSlave(s))}
                        className={`px-2 py-1.5 border-l text-xs transition-colors ${
                          isActive ? "border-zinc-600 bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700" : "border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <Settings size={13} />
                      </button>
                      {/* Rename */}
                      <button
                        disabled={isReadOnly}
                        title="Rename Slave ID"
                        onClick={() => openRenameModal(s.id)}
                        className={`px-2 py-1.5 border-l text-xs transition-colors ${
                          isActive ? "border-zinc-600 bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700" : "border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <Pencil size={13} />
                      </button>
                      {/* Delete */}
                      <button
                        disabled={isReadOnly}
                        title="Remove Slave"
                        onClick={() => removeSlave(s.id)}
                        className={`px-2 py-1.5 border-l text-xs transition-colors ${
                          isActive ? "border-zinc-600 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-700" : "border-slate-200 bg-white text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                        }`}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Slave settings form ── */}
          {slaveObj && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                Slave {activeSlaveId} — Configuration
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <label className="block">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Polling Interval</span>
                  <div className="flex mt-1.5 gap-2">
                    <input
                      type="number"
                      min="1"
                      value={slaveObj.pollingInterval}
                      disabled={isReadOnly}
                      onChange={(e) => updateSlave("pollingInterval", parseInt(e.target.value, 10) || 1)}
                      className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 text-slate-700"
                    />
                    <select
                      value={slaveObj.pollingIntervalUnit}
                      disabled={isReadOnly}
                      onChange={(e) => updateSlave("pollingIntervalUnit", e.target.value)}
                      className="border border-slate-200 rounded-lg px-2 py-2 text-sm bg-white focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 text-slate-700"
                    >
                      {["Sec", "Min", "Hour"].map((u) => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                </label>
                <div className="flex flex-col justify-end gap-3 pb-1">
                  <label className="flex items-center gap-2.5 text-sm text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!slaveObj.enabled}
                      disabled={isReadOnly}
                      onChange={(e) => updateSlave("enabled", e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 accent-zinc-700"
                    />
                    <span className="font-medium">Slave Enabled</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-sm text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!slaveObj.use_usb}
                      disabled={isReadOnly}
                      onChange={(e) => updateSlave("use_usb", e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 accent-zinc-700"
                    />
                    <span className="font-medium">Use USB</span>
                  </label>
                </div>
              </div>
              <DBSettings
                prefix="slave"
                db={slaveObj}
                role={role}
                onChange={(field, value) => updateSlave(field, value)}
              />
            </div>
          )}

          {/* ── Register table ── */}
          {activeSlaveId != null ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-gray-50 flex-wrap gap-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Register Map — Slave {activeSlaveId}
                </span>
                <div className="flex items-center gap-2">
                  <PresetsPanel
                    builtInSchema={builtInSchema}
                    brandKey={activeBrandKey}
                    brandPresets={brand?.presets}
                    globalPresets={devices.globalPresets}
                    onLoad={loadPreset}
                    onSave={savePreset}
                    onDelete={deletePreset}
                    onEditPreset={openEditPreset}
                    isReadOnly={isReadOnly}
                  />
                  <button
                    disabled={isReadOnly}
                    onClick={addRegisterRow}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    + Add Row
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <RegisterTable
                  rows={rows}
                  engineeringConfig={engConfig}
                  isSuperAdmin={isSuperAdmin}
                  isReadOnly={isReadOnly}
                  onRowChange={updateRegister}
                  onRemoveRow={removeRegisterRow}
                  onAlertOpen={openAlertModal}
                />
              </div>
              {rows.length === 0 && (
                <div className="text-center py-12 text-slate-400 text-sm">
                  No registers yet. Click "+ Add Row" to start.
                </div>
              )}
            </div>
          ) : activeBrandKey ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-400 text-sm">
              Select a slave above to view and edit its register map.
            </div>
          ) : null}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════════════════ */}

      {/* ── Slave RTU Settings Modal ── */}
      {slaveRTUModal.open && (
        <Modal title={`Slave ${activeSlaveId} — RTU Communication`} onClose={() => setSlaveRTUModal({ open: false, data: {} })}>
          <div className="space-y-4">
            {[
              { label: "RS485 Port", key: "rs485_port", isPort: true },
              { label: "Baud Rate", key: "baudRate", options: ["300","600","1200","2400","4800","9600","19200","38400","57600","115200","230400"], isNum: true },
              { label: "Parity", key: "parity", options: ["Even","Odd","None"] },
              { label: "Data Bits", key: "dataBits", options: [5,6,7,8], isNum: true },
              { label: "Stop Bits", key: "stopBits", options: [1,2], isNum: true },
            ].map(({ label, key, options, isNum, isPort }) => (
              <label key={key} className="block">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</span>
                {isPort ? (
                  <select
                    value={slaveRTUModal.data[key] ?? ""}
                    onChange={(e) => setSlaveRTUModal((d) => ({ ...d, data: { ...d.data, [key]: e.target.value } }))}
                    className="mt-1.5 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-zinc-400 text-slate-700"
                  >
                    {rs485Ports.length === 0
                      ? <option value="/dev/ttyAMA5">/dev/ttyAMA5 (default)</option>
                      : rs485Ports.map((p) => <option key={p.port} value={p.port}>{p.name}</option>)
                    }
                  </select>
                ) : (
                  <select
                    value={slaveRTUModal.data[key] ?? ""}
                    onChange={(e) => setSlaveRTUModal((d) => ({ ...d, data: { ...d.data, [key]: isNum ? Number(e.target.value) : e.target.value } }))}
                    className="mt-1.5 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-zinc-400 text-slate-700"
                  >
                    {options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                )}
              </label>
            ))}
          </div>
          <div className="flex gap-2 mt-6 pt-4 border-t border-slate-100">
            <button onClick={saveSlaveRTUModal} className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors">Save</button>
            <button onClick={() => setSlaveRTUModal({ open: false, data: {} })} className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-sm font-medium text-slate-600 transition-colors">Cancel</button>
          </div>
        </Modal>
      )}

      {/* ── Rename Slave ID Modal ── */}
      {renameModal.open && (
        <Modal title={`Rename Slave ${renameModal.slaveId}`} onClose={() => setRenameModal({ open: false, slaveId: null, newId: "" })} width={360}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                New Slave ID <span className="text-slate-400 font-normal normal-case">(1 – 247)</span>
              </label>
              <input
                type="number"
                min="1"
                max="247"
                value={renameModal.newId}
                onChange={(e) => setRenameModal((m) => ({ ...m, newId: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 text-slate-700"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && saveRenameModal()}
              />
              <p className="text-xs text-slate-400 mt-1.5">
                All registers and alarm settings for this slave will be migrated automatically.
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-6 pt-4 border-t border-slate-100">
            <button onClick={saveRenameModal} className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors">Update ID</button>
            <button onClick={() => setRenameModal({ open: false, slaveId: null, newId: "" })} className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-sm font-medium text-slate-600 transition-colors">Cancel</button>
          </div>
        </Modal>
      )}

      {/* ── Alert Settings Modal ── */}
      {alertModal.open && (
        <Modal title={`Alert Settings — ${rows[alertModal.rowIdx]?.name || `Row ${alertModal.rowIdx + 1}`}`} onClose={() => setAlertModal({ open: false, rowIdx: -1, data: {} })} width={520}>
          <div className="space-y-4">
            {/* Enable toggle */}
            <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={!!alertModal.data.enabled}
                onChange={(e) => setAlertModal((m) => ({ ...m, data: { ...m.data, enabled: e.target.checked } }))}
                className="h-4 w-4 rounded border-slate-300 accent-zinc-700"
              />
              <span className="text-sm font-medium text-slate-600">Enable Alerts for this register</span>
            </label>

            {/* Limits */}
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Lower Limit</span>
                <input
                  type="number"
                  value={alertModal.data.lower_limit ?? ""}
                  onChange={(e) => setAlertModal((m) => ({ ...m, data: { ...m.data, lower_limit: e.target.value === "" ? "" : Number(e.target.value) } }))}
                  placeholder="e.g. 0"
                  className="mt-1.5 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-zinc-400 text-slate-700"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Upper Limit</span>
                <input
                  type="number"
                  value={alertModal.data.upper_limit ?? ""}
                  onChange={(e) => setAlertModal((m) => ({ ...m, data: { ...m.data, upper_limit: e.target.value === "" ? "" : Number(e.target.value) } }))}
                  placeholder="e.g. 100"
                  className="mt-1.5 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-zinc-400 text-slate-700"
                />
              </label>
            </div>

            {/* Notification fields */}
            <label className="block">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Email</span>
              <input
                type="email"
                value={alertModal.data.email ?? ""}
                onChange={(e) => setAlertModal((m) => ({ ...m, data: { ...m.data, email: e.target.value } }))}
                placeholder="alerts@example.com"
                className="mt-1.5 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-zinc-400 text-slate-700"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Mobile Number</span>
              <input
                type="tel"
                value={alertModal.data.mobile ?? ""}
                onChange={(e) => setAlertModal((m) => ({ ...m, data: { ...m.data, mobile: e.target.value } }))}
                placeholder="+91 98765 43210"
                className="mt-1.5 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-zinc-400 text-slate-700"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Alert Message</span>
              <textarea
                value={alertModal.data.message ?? ""}
                onChange={(e) => setAlertModal((m) => ({ ...m, data: { ...m.data, message: e.target.value } }))}
                placeholder="e.g. Temperature exceeded safe threshold"
                rows={3}
                className="mt-1.5 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-zinc-400 text-slate-700 resize-none"
              />
            </label>

            {/* Superadmin-only: Digital Output */}
            {isSuperAdmin && (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50/60">
                <label className="block">
                  <span className="text-xs font-medium text-amber-700 uppercase tracking-wide">Digital Output Pin</span>
                  <select
                    value={alertModal.data.do_pin ?? ""}
                    onChange={(e) => setAlertModal((m) => ({ ...m, data: { ...m.data, do_pin: e.target.value } }))}
                    className="mt-1.5 w-full border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-amber-400 text-slate-700"
                  >
                    <option value="">— None —</option>
                    <option>DO1</option>
                    <option>DO2</option>
                    <option>DO3</option>
                    <option>DO4</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-amber-700 uppercase tracking-wide">DO Status</span>
                  <select
                    value={alertModal.data.do_status ?? "High"}
                    onChange={(e) => setAlertModal((m) => ({ ...m, data: { ...m.data, do_status: e.target.value } }))}
                    className="mt-1.5 w-full border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-amber-400 text-slate-700"
                  >
                    <option>High</option>
                    <option>Low</option>
                  </select>
                </label>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-6 pt-4 border-t border-slate-100">
            <button onClick={saveAlertModal} className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors">Save Alert Settings</button>
            <button onClick={() => setAlertModal({ open: false, rowIdx: -1, data: {} })} className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-sm font-medium text-slate-600 transition-colors">Cancel</button>
          </div>
        </Modal>
      )}

      {/* ── Brand Add Modal ── */}
      {brandModal.open && (
        <Modal title="Add New Device" onClose={() => setBrandModal({ open: false, name: "" })} width={380}>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Device / Brand Name</span>
            <input
              type="text"
              value={brandModal.name}
              onChange={(e) => setBrandModal((m) => ({ ...m, name: e.target.value }))}
              placeholder="e.g., Schneider EM6436H"
              className="mt-1.5 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-1 focus:ring-zinc-400 text-slate-700"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") { addBrand(brandModal.name); setBrandModal({ open: false, name: "" }); } }}
            />
          </label>
          <div className="flex gap-2 mt-6 pt-4 border-t border-slate-100">
            <button onClick={() => { addBrand(brandModal.name); setBrandModal({ open: false, name: "" }); }} className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors">Add Device</button>
            <button onClick={() => setBrandModal({ open: false, name: "" })} className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-sm font-medium text-slate-600 transition-colors">Cancel</button>
          </div>
        </Modal>
      )}

      {/* ── Full Preset Editor Modal ── */}
      {presetEditModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
          <div className="bg-white rounded-2xl shadow-2xl flex flex-col" style={{ width: "min(1280px, 96vw)", maxHeight: "92vh" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Edit Preset</span>
                <input
                  type="text"
                  value={presetEditModal.name}
                  onChange={(e) => setPresetEditModal((m) => ({ ...m, name: e.target.value }))}
                  className="border border-slate-200 rounded-md px-3 py-1.5 text-sm text-slate-700 focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400"
                  style={{ width: 240 }}
                  placeholder="Preset name"
                />
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">
                  {presetEditModal.scope === "global" ? "Global" : "Device"}
                </span>
              </div>
              <button onClick={closePresetEditModal} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 bg-gray-50 flex-shrink-0">
              <span className="text-xs text-slate-500">{presetEditModal.rows.length} row{presetEditModal.rows.length !== 1 ? "s" : ""}</span>
              <button
                onClick={addPresetEditRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-medium transition-colors"
              >
                + Add Row
              </button>
            </div>

            {/* Table */}
            <div className="overflow-auto flex-1 px-0">
              {presetEditModal.rows.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-sm">No rows yet. Click &quot;+ Add Row&quot; to start.</div>
              ) : (
                <RegisterTable
                  rows={presetEditModal.rows.map(normalizeRegisterRow)}
                  engineeringConfig={engConfig}
                  isSuperAdmin={isSuperAdmin}
                  isReadOnly={false}
                  onRowChange={updatePresetEditRow}
                  onRemoveRow={removePresetEditRow}
                  onAlertOpen={() => {}}
                />
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-2 px-6 py-4 border-t border-slate-100 flex-shrink-0">
              <button onClick={saveEditedPreset} disabled={!presetEditModal.name.trim()} className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                Save Preset
              </button>
              <button onClick={closePresetEditModal} className="px-8 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-sm font-medium text-slate-600 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
