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
  // Clean up orphaned registersBySlave keys (keys with no matching slave id)
  Object.values(next.ModbusRTU.Devices.brands || {}).forEach((brand) => {
    if (!brand.registersBySlave || !brand.slaves) return;
    const validIds = new Set((brand.slaves || []).map((s) => String(s.id)));
    Object.keys(brand.registersBySlave).forEach((key) => {
      if (!validIds.has(key)) delete brand.registersBySlave[key];
    });
  });
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
  // Derive mode from legacy read/write booleans if not already set
  const mode = r.mode ?? (r.write ? "write" : "read");
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
    mode,
    write_mode: r.write_mode ?? "independent",
    write_min_reg: r.write_min_reg ?? "",
    write_max_reg: r.write_max_reg ?? "",
    write_pct: r.write_pct ?? "",
    write_boolean: r.write_boolean ?? "true",
    // Keep for backward compatibility
    read: mode === "read",
    write: mode === "write",
    // Keep alert (singular) so RegisterTable write+alert range sync still works
    alert: {
      enabled: !!(r.alert?.enabled ?? r.alert_enabled),
      lower_limit: r.alert?.lower_limit ?? r.alert_lower_limit ?? r.lower_limit ?? "",
      upper_limit: r.alert?.upper_limit ?? r.alert_upper_limit ?? r.upper_limit ?? "",
    },
    // Multiple independent alerts — each has its own condition + notification + action
    alerts: (() => {
      const mk = (a) => ({
        tag: a.tag ?? "Lower Limit",
        enabled: !!(a.enabled ?? true),
        condition_type: a.condition_type ?? "simple",
        operator: a.operator ?? "<",
        limit: a.limit ?? "",
        lower_op: a.lower_op ?? "",
        lower_value: a.lower_value ?? "",
        upper_op: a.upper_op ?? "",
        upper_value: a.upper_value ?? "",
        email: a.email ?? "",
        mobile: a.mobile ?? "",
        message: a.message ?? "",
        action_type: a.action_type ?? "none",
        do_pin: a.do_pin ?? "",
        do_status: a.do_status ?? "High",
        target_brand_key: a.target_brand_key ?? "",
        target_slave_id: a.target_slave_id ?? "",
        target_register_name: a.target_register_name ?? "",
        write_value_pct: a.write_value_pct ?? "",
        write_value_boolean: a.write_value_boolean ?? "true",
      });
      if (r.alerts?.length) return r.alerts.map(mk);
      // Migrate from previous conditions-array implementation
      if (r.alert?.conditions?.length) {
        return r.alert.conditions.map((c) => mk({ ...c, enabled: r.alert.enabled, email: r.alert.email, mobile: r.alert.mobile, message: r.alert.message, action_type: r.alert.action_type, do_pin: r.alert.do_pin, do_status: r.alert.do_status, target_brand_key: r.alert.target_brand_key, target_slave_id: r.alert.target_slave_id, target_register_name: r.alert.target_register_name, write_value_pct: r.alert.write_value_pct, write_value_boolean: r.alert.write_value_boolean }));
      }
      // Migrate from legacy flat lower_limit / upper_limit
      const ll = r.alert?.lower_limit ?? r.alert_lower_limit ?? r.lower_limit;
      const ul = r.alert?.upper_limit ?? r.alert_upper_limit ?? r.upper_limit;
      const base = { enabled: r.alert?.enabled, email: r.alert?.email, mobile: r.alert?.mobile, message: r.alert?.message, action_type: r.alert?.action_type ?? "none", do_pin: r.alert?.do_pin, do_status: r.alert?.do_status, target_brand_key: r.alert?.target_brand_key, target_slave_id: r.alert?.target_slave_id, target_register_name: r.alert?.target_register_name, write_value_pct: r.alert?.write_value_pct, write_value_boolean: r.alert?.write_value_boolean };
      const migrated = [];
      if (ll !== "" && ll != null) migrated.push(mk({ ...base, tag: "Lower Limit", condition_type: "simple", operator: "<", limit: Number(ll) }));
      if (ul !== "" && ul != null) migrated.push(mk({ ...base, tag: "Upper Limit", condition_type: "simple", operator: ">", limit: Number(ul), action_type: "none" }));
      return migrated;
    })(),
    alert_allocated_to: r.alert_allocated_to ?? "",
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
      // Migrate alarmSettings.Modbus slave key
      const modAlarms = next.alarmSettings?.Modbus?.[activeBrandKey];
      if (modAlarms?.slaves?.[String(slaveId)]) {
        modAlarms.slaves[String(n)] = modAlarms.slaves[String(slaveId)];
        delete modAlarms.slaves[String(slaveId)];
      }
      // Migrate alarmSettings.ModbusRTU keys — pattern: {brandKey}_S{slaveId}_{regName}
      const rtu = next.alarmSettings?.ModbusRTU;
      if (rtu) {
        const oldPrefix = `${activeBrandKey}_S${slaveId}_`;
        const newPrefix = `${activeBrandKey}_S${n}_`;
        Object.keys(rtu).forEach((key) => {
          if (key.startsWith(oldPrefix)) {
            rtu[`${newPrefix}${key.slice(oldPrefix.length)}`] = rtu[key];
            delete rtu[key];
          }
        });
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
    setAlertModal({ open: true, rowIdx, data: { alerts: deepClone(row.alerts ?? []) } });
  };

  const saveAlertModal = () => {
    const { rowIdx, data } = alertModal;
    setLocalCfg((prev) => {
      const next = deepClone(prev);
      const brand = next.ModbusRTU.Devices.brands[activeBrandKey];
      const key = String(activeSlaveId);
      const rowList = brand.registersBySlave[key] || [];
      const currentRow = rowList[rowIdx];
      const ownerKey = `${activeBrandKey}|${key}|${currentRow?.name ?? ""}`;

      // Clear all previous write_register allocations owned by this row
      const clearAlloc = (a) => {
        if (a?.action_type === "write_register" && a.target_brand_key && a.target_register_name) {
          const regs = next.ModbusRTU.Devices.brands[a.target_brand_key]?.registersBySlave?.[String(a.target_slave_id)] || [];
          regs.forEach((reg) => { if (reg.name === a.target_register_name && reg.alert_allocated_to === ownerKey) reg.alert_allocated_to = ""; });
        }
      };
      (currentRow?.alerts ?? []).forEach(clearAlloc);
      clearAlloc(currentRow?.alert); // also clear any legacy single-alert allocation

      // Set new allocations for all alerts in the new data
      (data.alerts ?? []).forEach((a) => {
        if (a.action_type === "write_register" && a.target_brand_key && a.target_slave_id && a.target_register_name) {
          const regs = next.ModbusRTU.Devices.brands[a.target_brand_key]?.registersBySlave?.[String(a.target_slave_id)] || [];
          regs.forEach((reg) => { if (reg.name === a.target_register_name) reg.alert_allocated_to = ownerKey; });
        }
      });

      rowList[rowIdx] = { ...rowList[rowIdx], alerts: data.alerts ?? [] };
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
          {isSaving ? "Saving…" : "Save"}
        </button>
      </div>

      {/* ══ Top tabs ══ */}
      <div className="flex border-b border-slate-200 mb-5">
        {["Devices"].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTopTab(t)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${activeTopTab === t
              ? "border-zinc-700 text-zinc-800"
              : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
          >
            {t}
          </button>
        ))}
      </div>


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
                  className={`group flex items-center gap-0 rounded-lg border overflow-hidden transition-all ${activeBrandKey === key
                    ? "border-zinc-600 shadow-sm"
                    : "border-slate-200 hover:border-slate-300"
                    }`}
                >
                  <button
                    onClick={() => {
                      setActiveBrandKey(key);
                      setActiveSlaveId(devices.brands[key]?.slaves?.[0]?.id ?? null);
                    }}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${activeBrandKey === key
                      ? "bg-zinc-800 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                  >
                    {devices.brands[key]?.label || key}
                  </button>
                  <button
                    disabled={isReadOnly}
                    onClick={() => removeBrand(key)}
                    className={`px-2 py-2 text-sm transition-colors ${activeBrandKey === key
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
                      className={`flex items-center rounded-lg border overflow-hidden transition-all ${isActive
                        ? "border-zinc-600 shadow-sm"
                        : "border-slate-200 hover:border-slate-300"
                        }`}
                    >
                      <button
                        onClick={() => setActiveSlaveId(s.id)}
                        className={`px-3 py-1.5 text-sm font-semibold transition-colors ${isActive ? "bg-zinc-800 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                      >
                        Slave {s.id}
                      </button>
                      {/* RTU Settings */}
                      <button
                        title="RTU Communication Settings"
                        onClick={() => openSlaveRTUModal(normalizeSlave(s))}
                        className={`px-2 py-1.5 border-l text-xs transition-colors ${isActive ? "border-zinc-600 bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700" : "border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                          }`}
                      >
                        <Settings size={13} />
                      </button>
                      {/* Rename */}
                      <button
                        disabled={isReadOnly}
                        title="Rename Slave ID"
                        onClick={() => openRenameModal(s.id)}
                        className={`px-2 py-1.5 border-l text-xs transition-colors ${isActive ? "border-zinc-600 bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700" : "border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                          }`}
                      >
                        <Pencil size={13} />
                      </button>
                      {/* Delete */}
                      <button
                        disabled={isReadOnly}
                        title="Remove Slave"
                        onClick={() => removeSlave(s.id)}
                        className={`px-2 py-1.5 border-l text-xs transition-colors ${isActive ? "border-zinc-600 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-700" : "border-slate-200 bg-white text-slate-300 hover:text-rose-500 hover:bg-rose-50"
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
              { label: "Baud Rate", key: "baudRate", options: ["300", "600", "1200", "2400", "4800", "9600", "19200", "38400", "57600", "115200", "230400"], isNum: true },
              { label: "Parity", key: "parity", options: ["Even", "Odd", "None"] },
              { label: "Data Bits", key: "dataBits", options: [5, 6, 7, 8], isNum: true },
              { label: "Stop Bits", key: "stopBits", options: [1, 2], isNum: true },
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
            <button onClick={saveSlaveRTUModal} className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors">Okay</button>
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
      {alertModal.open && (() => {
        const currentRow = rows[alertModal.rowIdx];
        const isWriteAlert = currentRow?.mode === "write" && currentRow?.write_mode === "alert";
        const ownerKey = activeBrandKey ? `${activeBrandKey}|${activeSlaveId}|${currentRow?.name ?? ""}` : "";

        // Collect all Write+Alert registers across every brand/slave
        const allWriteAlertRegs = [];
        Object.entries(localCfg.ModbusRTU.Devices.brands || {}).forEach(([bk, brandData]) => {
          const brandLabel = brandData.label || bk;
          Object.entries(brandData.registersBySlave || {}).forEach(([slaveId, regs]) => {
            (regs || []).forEach((reg) => {
              const n = normalizeRegisterRow(reg);
              if (n.mode === "write" && n.write_mode === "alert") {
                allWriteAlertRegs.push({ brandKey: bk, brandLabel, slaveId, name: n.name || `Slave ${slaveId} Reg`, sql_type: n.sql_type, min: n.write_min_reg, max: n.write_max_reg, allocatedTo: n.alert_allocated_to ?? "" });
              }
            });
          });
        });

        // Shared input style
        const inp = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:border-zinc-500 text-slate-700 placeholder-slate-400 transition-all";
        const sel = "border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:border-zinc-500 text-slate-700 transition-all";
        const lbl = "text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block";

        const addAlert = () => setAlertModal((m) => ({
          ...m,
          data: { ...m.data, alerts: [...(m.data.alerts ?? []), { tag: "Lower Limit", enabled: true, condition_type: "simple", operator: "<", limit: "", lower_op: "<", lower_value: "", upper_op: "<", upper_value: "", email: "", mobile: "", message: "", action_type: "none", do_pin: "", do_status: "High", target_brand_key: "", target_slave_id: "", target_register_name: "", write_value_pct: "", write_value_boolean: "true" }] },
        }));
        const updAlert = (ai, patch) => setAlertModal((m) => {
          const next = [...(m.data.alerts ?? [])];
          next[ai] = { ...next[ai], ...patch };
          return { ...m, data: { ...m.data, alerts: next } };
        });
        const remAlert = (ai) => setAlertModal((m) => ({ ...m, data: { ...m.data, alerts: (m.data.alerts ?? []).filter((_, i) => i !== ai) } }));

        const modalAlerts = alertModal.data.alerts ?? [];

        return (
          <Modal title={`Alert Settings — ${currentRow?.name || `Row ${alertModal.rowIdx + 1}`}`} onClose={() => setAlertModal({ open: false, rowIdx: -1, data: {} })} width={660}>
            <div className="space-y-5">

              {/* ── Write-Alert registers summary ── */}
              {allWriteAlertRegs.length > 0 && (
                <div className="rounded-xl border border-amber-200 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-amber-50 border-b border-amber-200">
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Write-Alert Registers</span>
                    <span className="text-[10px] font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">{allWriteAlertRegs.length}</span>
                  </div>
                  <div className="divide-y divide-amber-100 bg-white">
                    {allWriteAlertRegs.map((wr, wi) => {
                      const isTaken = wr.allocatedTo && wr.allocatedTo !== ownerKey;
                      return (
                        <div key={wi} className="flex items-center gap-3 px-4 py-2 text-xs">
                          <span className={`font-semibold ${isTaken ? "line-through text-slate-400" : "text-slate-700"}`}>
                            {wr.brandLabel} <span className="text-slate-400">›</span> Slave {wr.slaveId} <span className="text-slate-400">›</span> {wr.name}
                          </span>
                          <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
                            <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px] font-mono">{wr.sql_type}</span>
                            {(wr.min !== "" || wr.max !== "") && <span className="text-slate-400 text-[10px]">[{wr.min !== "" ? wr.min : "—"}–{wr.max !== "" ? wr.max : "—"}]</span>}
                            {isTaken
                              ? <span className="text-[10px] font-semibold text-rose-500 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">In use</span>
                              : <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Free</span>
                            }
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {isWriteAlert && (
                <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                  <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0 mt-1" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    This register is in <b>Write-Alert</b> mode. Write output range is configured in the register table.
                  </p>
                </div>
              )}

              {/* ── Alerts list ── */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">Alerts</span>
                    {modalAlerts.length > 0 && (
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{modalAlerts.length}</span>
                    )}
                  </div>
                  <button type="button" onClick={addAlert}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm">
                    + Add Alert
                  </button>
                </div>

                {modalAlerts.length === 0 && (
                  <div className="text-center py-10 rounded-2xl border-2 border-dashed border-slate-200">
                    <p className="text-sm text-slate-400 font-medium">No alerts configured</p>
                    <p className="text-xs text-slate-300 mt-1">Click &quot;+ Add Alert&quot; to get started</p>
                  </div>
                )}

                {modalAlerts.map((a, ai) => {
                  const aType = a.action_type ?? "none";
                  const isEnabled = !!a.enabled;
                  const availRegs = allWriteAlertRegs.filter((reg) => !reg.allocatedTo || reg.allocatedTo === ownerKey);
                  const selReg = allWriteAlertRegs.find(
                    (reg) => reg.brandKey === String(a.target_brand_key ?? "") && String(reg.slaveId) === String(a.target_slave_id ?? "") && reg.name === String(a.target_register_name ?? "")
                  ) ?? null;
                  const selIsBool = selReg?.sql_type === "BOOLEAN";

                  return (
                    <div key={ai} className={`rounded-2xl overflow-hidden shadow-sm border-2 transition-all ${isEnabled ? "border-zinc-300" : "border-slate-200 opacity-80"}`}>

                      {/* ── Card Header ── */}
                      <div className={`flex items-center gap-3 px-4 py-3 ${isEnabled ? "bg-zinc-500" : "bg-slate-100 "}`}>
                        <label className="flex-shrink-0 cursor-pointer" title={isEnabled ? "Disable alert" : "Enable alert"}>
                          <input type="checkbox" checked={isEnabled}
                            onChange={(e) => updAlert(ai, { enabled: e.target.checked })}
                            className="h-4 w-4 rounded cursor-pointer accent-white" />
                        </label>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${isEnabled ? "bg-white/20 text-white" : "bg-white text-slate-500 border border-slate-200"}`}>
                          #{ai + 1}
                        </span>

                        {/* Tag — only shown for simple conditions; label shown for range */}
                        {a.condition_type !== "range" ? (
                          <div className="flex-1 min-w-0">
                            <select value={a.tag ?? "Lower Limit"} onChange={(e) => updAlert(ai, { tag: e.target.value })}
                              className="w-full rounded-lg px-3 py-1.5 text-sm font-semibold border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-zinc-300 transition-all">
                              <option value="Lower Limit">Lower Limit</option>
                              <option value="Upper Limit">Upper Limit</option>
                            </select>
                          </div>
                        ) : (
                          <span className={`flex-1 text-sm font-semibold tracking-wide ${isEnabled ? "text-white" : "text-slate-600"}`}>
                            Range Condition
                          </span>
                        )}

                        {/* Condition type */}
                        <div className="flex-shrink-0">
                          <select value={a.condition_type ?? "simple"} onChange={(e) => updAlert(ai, { condition_type: e.target.value })}
                            className="rounded-lg px-3 py-1.5 text-xs font-semibold border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-zinc-300 transition-all">
                            <option value="simple">Simple</option>
                            <option value="range">Range</option>
                          </select>
                        </div>

                        {/* Remove */}
                        <button type="button" onClick={() => remAlert(ai)}
                          className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${isEnabled ? "hover:bg-white/20 text-white/60 hover:text-white" : "text-slate-400 hover:text-red-500 hover:bg-red-50"}`}
                          title="Remove alert">
                          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="1" y1="1" x2="11" y2="11" /><line x1="11" y1="1" x2="1" y2="11" />
                          </svg>
                        </button>
                      </div>

                      {/* ── Card Body ── */}
                      <div className="px-4 py-4 space-y-4 bg-white">

                        {/* Condition */}
                        <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                          <span className={lbl}>Condition</span>
                          {a.condition_type !== "range" ? (
                            /* ── Simple: Value [op] [limit] ── */
                            <div className="flex items-center gap-2">
                              <span className="flex-shrink-0 text-xs font-semibold text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-2">Value</span>
                              <select value={a.operator ?? "<"} onChange={(e) => updAlert(ai, { operator: e.target.value })}
                                className={`${sel} font-mono`}>
                                <option value="<">&lt;</option>
                                <option value="<=">&lt;=</option>
                                <option value=">">&gt;</option>
                                <option value=">=">&gt;=</option>
                              </select>
                              <input type="number" placeholder="Enter limit value"
                                value={a.limit ?? ""}
                                onChange={(e) => updAlert(ai, { limit: e.target.value === "" ? "" : Number(e.target.value) })}
                                className={inp} />
                            </div>
                          ) : (
                            /* ── Range: [lower] [op] Value [op] [upper] ── */
                            // <div style={{ display: "grid", gridTemplateColumns: "1fr 72px 56px 72px 1fr", gap: "8px", alignItems: "end" }}>
                            //   {/* Lower value */}
                            //   <div>
                            //     <p className="text-[10px] text-slate-400 mb-1">Lower</p>
                            //     <input type="number" placeholder="e.g. 5"
                            //       value={a.lower_value ?? ""}
                            //       onChange={(e) => updAlert(ai, { lower_value: e.target.value === "" ? "" : Number(e.target.value) })}
                            //       className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300 text-slate-700 placeholder-slate-400" />
                            //   </div>
                            //   {/* Lower operator */}
                            //   <div>
                            //     <p className="text-[10px] text-slate-400 mb-1 text-center">op</p>
                            //     <select value={a.lower_op ?? "<"} onChange={(e) => updAlert(ai, { lower_op: e.target.value })}
                            //       className="w-full border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300 text-slate-700 font-mono text-center">
                            //       <option value="<">&lt;</option>
                            //       <option value="<=">&lt;=</option>
                            //     </select>
                            //   </div>
                            //   {/* Value badge */}
                            //   <div>
                            //     <p className="text-[10px] text-slate-400 mb-1 text-center">reading</p>
                            //     <div className="bg-zinc-800 text-white text-xs font-bold rounded-lg py-2 text-center tracking-wide">
                            //       Val
                            //     </div>
                            //   </div>
                            //   {/* Upper operator */}
                            //   <div>
                            //     <p className="text-[10px] text-slate-400 mb-1 text-center">op</p>
                            //     <select value={a.upper_op ?? "<"} onChange={(e) => updAlert(ai, { upper_op: e.target.value })}
                            //       className="w-full border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300 text-slate-700 font-mono text-center">
                            //       <option value="<">&lt;</option>
                            //       <option value="<=">&lt;=</option>
                            //     </select>
                            //   </div>
                            //   {/* Upper value */}
                            //   <div>
                            //     <p className="text-[10px] text-slate-400 mb-1">Upper</p>
                            //     <input type="number" placeholder="e.g. 10"
                            //       value={a.upper_value ?? ""}
                            //       onChange={(e) => updAlert(ai, { upper_value: e.target.value === "" ? "" : Number(e.target.value) })}
                            //       className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300 text-slate-700 placeholder-slate-400" />
                            //   </div>
                            // </div>

                            /* ── Range: [lower] [op] Value [op] [upper] ── */
                            <div className="w-full">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                Value Range Configuration
                              </p>

                              <div className="grid grid-cols-[1fr_auto_80px_auto_1fr] items-stretch w-full bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">

                                {/* 1. Lower Value Cell */}
                                <div className="flex items-center justify-center p-3 border-r border-slate-100 bg-white">
                                  <input
                                    type="number"
                                    placeholder="Min"
                                    value={a.lower_value ?? ""}
                                    onChange={(e) => updAlert(ai, { lower_value: e.target.value === "" ? "" : Number(e.target.value) })}
                                    className="w-full text-center text-sm font-semibold text-slate-700 placeholder-slate-300 outline-none border-none bg-transparent"
                                  />
                                </div>

                                {/* 2. Lower Operator Cell */}
                                <div className="flex items-center justify-center px-4 bg-slate-50/50 border-r border-slate-100">
                                  <select
                                    value={a.lower_op ?? "<"}
                                    onChange={(e) => updAlert(ai, { lower_op: e.target.value })}
                                    className="appearance-none bg-transparent text-slate-500 font-mono font-bold text-base cursor-pointer outline-none hover:text-zinc-800 transition-colors text-center"
                                  >
                                    <option value="<">&lt;</option>
                                    <option value="<=">&le;</option>
                                  </select>
                                </div>

                                {/* 3. Reading/Value Badge Cell */}
                                <div className="flex flex-col items-center justify-center px-2 py-3 bg-slate-100/30 border-r border-slate-100 min-w-[100px]">
                                  <div className="bg-zinc-800 text-white text-[10px] font-bold rounded-md px-3 py-1 shadow-sm ring-1 ring-zinc-900">
                                    VALUE
                                  </div>
                                </div>

                                {/* 4. Upper Operator Cell */}
                                <div className="flex items-center justify-center px-4 bg-slate-50/50 border-r border-slate-100">
                                  <select
                                    value={a.upper_op ?? "<"}
                                    onChange={(e) => updAlert(ai, { upper_op: e.target.value })}
                                    className="appearance-none bg-transparent text-slate-500 font-mono font-bold text-base cursor-pointer outline-none hover:text-zinc-800 transition-colors text-center"
                                  >
                                    <option value="<">&lt;</option>
                                    <option value="<=">&le;</option>
                                  </select>
                                </div>

                                {/* 5. Upper Value Cell */}
                                <div className="flex items-center justify-center p-3 bg-white">
                                  <input
                                    type="number"
                                    placeholder="Max"
                                    value={a.upper_value ?? ""}
                                    onChange={(e) => updAlert(ai, { upper_value: e.target.value === "" ? "" : Number(e.target.value) })}
                                    className="w-full text-center text-sm font-semibold text-slate-700 placeholder-slate-300 outline-none border-none bg-transparent"
                                  />
                                </div>

                              </div>
                            </div>
                          )}
                        </div>

                        {/* Notification */}
                        <div className="space-y-3">
                          <span className={lbl}>Notification</span>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className="text-[10px] text-slate-400 mb-1 block">Email</span>
                              <input type="email" placeholder="alerts@example.com"
                                value={a.email ?? ""} onChange={(e) => updAlert(ai, { email: e.target.value })}
                                className={inp} />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 mb-1 block">Mobile</span>
                              <input type="tel" placeholder="+91 98765 43210"
                                value={a.mobile ?? ""} onChange={(e) => updAlert(ai, { mobile: e.target.value })}
                                className={inp} />
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 mb-1 block">Message</span>
                            <input type="text" placeholder="Alert message…"
                              value={a.message ?? ""} onChange={(e) => updAlert(ai, { message: e.target.value })}
                              className={inp} />
                          </div>
                        </div>

                        {/* Action — segmented button group */}
                        <div className="space-y-3">
                          <span className={lbl}>Action on Trigger</span>
                          <div className="flex rounded-xl border border-slate-200 overflow-hidden">
                            <button type="button" onClick={() => updAlert(ai, { action_type: "none" })}
                              className={`flex-1 py-2 text-xs font-semibold transition-colors ${aType === "none" ? "bg-zinc-800 text-white shadow-inner" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
                              None
                            </button>
                            {isSuperAdmin && (
                              <button type="button" onClick={() => updAlert(ai, { action_type: "do_pin" })}
                                className={`flex-1 py-2 text-xs font-semibold border-l border-slate-200 transition-colors ${aType === "do_pin" ? "bg-zinc-800 text-white shadow-inner" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
                                Digital Output
                              </button>
                            )}
                            {allWriteAlertRegs.length > 0 && (
                              <button type="button" onClick={() => updAlert(ai, { action_type: "write_register" })}
                                className={`flex-1 py-2 text-xs font-semibold border-l border-slate-200 transition-colors ${aType === "write_register" ? "bg-zinc-800 text-white shadow-inner" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
                                Write Register
                              </button>
                            )}
                          </div>

                          {/* DO Pin sub-panel */}
                          {isSuperAdmin && aType === "do_pin" && (
                            <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                              <div>
                                <span className="text-[10px] text-slate-400 mb-1 block">Digital Output Pin</span>
                                <select value={a.do_pin ?? ""} onChange={(e) => updAlert(ai, { do_pin: e.target.value })} className={`${sel} w-full`}>
                                  <option value="">— None —</option>
                                  <option>DO1</option><option>DO2</option><option>DO3</option><option>DO4</option>
                                </select>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 mb-1 block">Status</span>
                                <select value={a.do_status ?? "High"} onChange={(e) => updAlert(ai, { do_status: e.target.value })} className={`${sel} w-full`}>
                                  <option>High</option><option>Low</option>
                                </select>
                              </div>
                            </div>
                          )}

                          {/* Write Register sub-panel */}
                          {aType === "write_register" && (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                              <div>
                                <span className="text-[10px] text-slate-400 mb-1 block">Target Register</span>
                                <div className="flex gap-2">
                                  <select
                                    value={`${a.target_brand_key ?? ""}|${a.target_slave_id ?? ""}|${a.target_register_name ?? ""}`}
                                    onChange={(e) => {
                                      const [bk, sid, rname] = e.target.value.split("|");
                                      updAlert(ai, { target_brand_key: bk, target_slave_id: sid, target_register_name: rname, write_value_pct: "", write_value_boolean: "true" });
                                    }}
                                    className={`flex-1 ${sel}`}
                                  >
                                    <option value="||">— Select a register —</option>
                                    {availRegs.map((reg, ri) => (
                                      <option key={ri} value={`${reg.brandKey}|${reg.slaveId}|${reg.name}`}>
                                        {reg.brandLabel} › Slave {reg.slaveId} › {reg.name} ({reg.sql_type}){reg.min !== "" || reg.max !== "" ? ` [${reg.min}–${reg.max}]` : ""}
                                      </option>
                                    ))}
                                  </select>
                                  {a.target_register_name && (
                                    <button type="button"
                                      onClick={() => updAlert(ai, { target_brand_key: "", target_slave_id: "", target_register_name: "", write_value_pct: "", write_value_boolean: "true" })}
                                      className="flex-shrink-0 px-3 py-2 text-xs font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                                      Clear
                                    </button>
                                  )}
                                </div>
                              </div>
                              {selReg && (
                                <div>
                                  <span className="text-[10px] text-slate-400 mb-1 block">{selIsBool ? "Output Value" : "Write Value (%)"}</span>
                                  {selIsBool ? (
                                    <select value={a.write_value_boolean ?? "true"} onChange={(e) => updAlert(ai, { write_value_boolean: e.target.value })} className={`${sel} w-full`}>
                                      <option value="true">True</option><option value="false">False</option>
                                    </select>
                                  ) : (
                                    <input type="number" min={0} max={100} placeholder="0 – 100"
                                      value={a.write_value_pct ?? ""} onChange={(e) => updAlert(ai, { write_value_pct: e.target.value })}
                                      className={inp} />
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
              <button onClick={saveAlertModal} className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm">Save Alerts</button>
              <button onClick={() => setAlertModal({ open: false, rowIdx: -1, data: {} })} className="px-8 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-medium text-slate-600 transition-colors">Cancel</button>
            </div>
          </Modal>
        );
      })()}


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
                  onAlertOpen={() => { }}
                />
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-2 px-6 py-4 border-t border-slate-100 flex-shrink-0">
              <button onClick={saveEditedPreset} disabled={!presetEditModal.name.trim()} className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                Okay
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
