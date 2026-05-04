export function deepClone(v) { return JSON.parse(JSON.stringify(v)); }

export function convertToSec(val, unit) {
  if (unit === "min") return val * 60;
  if (unit === "hour") return val * 3600;
  return val;
}

export function convertFromSec(sec, unit) {
  if (unit === "min") return sec / 60;
  if (unit === "hour") return sec / 3600;
  return sec;
}

export function normalizeSiemensRow(r) {
  return {
    content: r.content ?? "",
    DB_no: r.DB_no ?? 0,
    address: r.address ?? 0,
    type: r.type ?? "float",
    size: r.size ?? "",
    min: r.min ?? "",
    max: r.max ?? "",
    value: r.value ?? "",
    read: r.read !== false,
    write: r.write ?? false,
  };
}

export function normalizeAllenBradleyRow(r) {
  return {
    tag: r.tag ?? "",
    address: r.address ?? "",
    datatype: r.datatype ?? "FLOAT",
    length: r.length ?? 1,
    min: r.min ?? "",
    max: r.max ?? "",
    value: r.value ?? "",
    read: r.read !== false,
    write: r.write ?? false,
  };
}

function normalizeSiemensPLC(plc) {
  return {
    cred: {
      ip: plc.cred?.ip ?? "192.168.0.1",
      rack: plc.cred?.rack ?? 0,
      slot: plc.cred?.slot ?? 2,
    },
    address_access: {
      read: (plc.address_access?.read ?? []).map(normalizeSiemensRow),
    },
    data_freq_sec: plc.data_freq_sec ?? 1,
    data_freq_unit: plc.data_freq_unit ?? "sec",
    Database: {
      upload_local: plc.Database?.upload_local ?? true,
      upload_cloud: plc.Database?.upload_cloud ?? false,
      db_name: plc.Database?.db_name ?? "test",
      table_name: plc.Database?.table_name ?? "",
    },
  };
}

function normalizeAllenBradleyPLC(plc) {
  return {
    cred: {
      ip: plc.cred?.ip ?? "192.168.1.200",
      port: plc.cred?.port ?? 44818,
    },
    address_access: {
      read: (plc.address_access?.read ?? []).map(normalizeAllenBradleyRow),
    },
    data_freq_sec: plc.data_freq_sec ?? 1,
    data_freq_unit: plc.data_freq_unit ?? "sec",
    Database: {
      upload_local: plc.Database?.upload_local ?? true,
      upload_cloud: plc.Database?.upload_cloud ?? false,
      db_name: plc.Database?.db_name ?? "test",
      table_name: plc.Database?.table_name ?? "",
    },
  };
}

export function normalizePlcEntry(entry) {
  const plcType = entry.plcType ?? "Siemens";
  const rawPLC = entry.PLC ?? {};
  const PLC = plcType === "Siemens"
    ? normalizeSiemensPLC(rawPLC)
    : normalizeAllenBradleyPLC(rawPLC);
  return {
    plcType,
    isExpanded: entry.isExpanded ?? true,
    enabled: entry.enabled ?? true,
    PLC,
  };
}

export function ensureBase(cfg) {
  const next = { ...(cfg ?? {}) };
  next.plc_configurations = (next.plc_configurations ?? []).map(normalizePlcEntry);
  return next;
}
