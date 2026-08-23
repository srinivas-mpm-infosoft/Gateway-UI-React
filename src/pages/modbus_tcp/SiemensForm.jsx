import React from "react";
import { X } from "lucide-react";
import DBSettings from "../DBSettings";
import { convertFromSec, convertToSec, normalizeSiemensRow } from "./helpers";

// ─── Siemens type catalogue ────────────────────────────────────────────────
const SIEMENS_TYPES = [
  // Bit strings
  { value: "BOOL",    size: "1 bit",    category: "bool"    },
  { value: "BYTE",    size: "1 byte",   category: "numeric" },
  { value: "WORD",    size: "2 bytes",  category: "numeric" },
  { value: "DWORD",   size: "4 bytes",  category: "numeric" },
  { value: "LWORD",   size: "8 bytes",  category: "numeric" },
  // Signed integers
  { value: "SINT",    size: "1 byte",   category: "numeric" },
  { value: "INT",     size: "2 bytes",  category: "numeric" },
  { value: "DINT",    size: "4 bytes",  category: "numeric" },
  { value: "LINT",    size: "8 bytes",  category: "numeric" },
  // Unsigned integers
  { value: "USINT",   size: "1 byte",   category: "numeric" },
  { value: "UINT",    size: "2 bytes",  category: "numeric" },
  { value: "UDINT",   size: "4 bytes",  category: "numeric" },
  { value: "ULINT",   size: "8 bytes",  category: "numeric" },
  // Floating point
  { value: "REAL",    size: "4 bytes",  category: "numeric" },
  { value: "LREAL",   size: "8 bytes",  category: "numeric" },
  // Timers / Counters
  { value: "S5TIME",  size: "2 bytes",  category: "numeric" },
  { value: "COUNTER", size: "2 bytes",  category: "numeric" },
  // Date / Time
  { value: "DATE",    size: "2 bytes",  category: "numeric" },
  { value: "TIME",    size: "4 bytes",  category: "numeric" },
  { value: "TOD",     size: "4 bytes",  category: "numeric" },
  { value: "LTIME",   size: "8 bytes",  category: "numeric" },
  { value: "LTOD",    size: "8 bytes",  category: "numeric" },
  { value: "DT",      size: "8 bytes",  category: "numeric" },
  { value: "LDT",     size: "8 bytes",  category: "numeric" },
  { value: "DTL",     size: "12 bytes", category: "numeric" },
  // Characters / Strings
  { value: "CHAR",    size: "1 byte",   category: "char"    },
  { value: "WCHAR",   size: "2 bytes",  category: "char"    },
  { value: "STRING",  size: "dynamic",  category: "char"    },
  { value: "WSTRING", size: "dynamic",  category: "char"    },
];

// Maps legacy lowercase types used in older configs to their Siemens equivalents
const LEGACY_TYPE_MAP = {
  float: "REAL", real: "REAL", dint: "DINT", int: "INT",
  bool: "BOOL", string: "STRING",
};

const TYPE_MAP = Object.fromEntries(SIEMENS_TYPES.map((t) => [t.value, t]));

function getTypeInfo(typeName) {
  const canonical = LEGACY_TYPE_MAP[typeName] ?? typeName;
  return TYPE_MAP[canonical] ?? { value: typeName, size: "—", category: "numeric" };
}

const CHAR_HINTS = {
  CHAR:    "ASCII char — 1 byte",
  WCHAR:   "Wide char — 2 bytes",
  STRING:  "String up to 254 characters",
  WSTRING: "Wide string up to 16,382 characters",
};

// ─── Styles ────────────────────────────────────────────────────────────────
const inp  = "w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 text-slate-700 disabled:bg-slate-50 disabled:text-slate-400";
const th   = "text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-2 whitespace-nowrap";
const td   = "px-2 py-1.5 align-middle";

export default function SiemensForm({ plc, onChange, role, isReadOnly }) {
  const rows        = plc.address_access?.read ?? [];
  const displayFreq = convertFromSec(plc.data_freq_sec ?? 1, plc.data_freq_unit ?? "sec");

  const updCred = (field, value) =>
    onChange((p) => ({ ...p, PLC: { ...p.PLC, cred: { ...p.PLC.cred, [field]: value } } }));

  const updFreqValue = (val) =>
    onChange((p) => ({ ...p, PLC: { ...p.PLC, data_freq_sec: convertToSec(Number(val) || 0, p.PLC.data_freq_unit) } }));

  const updFreqUnit = (unit) =>
    onChange((p) => ({ ...p, PLC: { ...p.PLC, data_freq_unit: unit } }));

  const updDB = (field, value) =>
    onChange((p) => ({ ...p, PLC: { ...p.PLC, Database: { ...p.PLC.Database, [field]: value } } }));

  const updRow = (i, field, value) =>
    onChange((p) => {
      const read = [...(p.PLC.address_access?.read ?? [])];
      read[i] = { ...read[i], [field]: value };
      return { ...p, PLC: { ...p.PLC, address_access: { ...p.PLC.address_access, read } } };
    });

  // When type changes, reset output_mode and clear value/output_pct to avoid stale data
  const updType = (i, newType) =>
    onChange((p) => {
      const read = [...(p.PLC.address_access?.read ?? [])];
      read[i] = { ...read[i], type: newType, output_pct: "", value: "" };
      return { ...p, PLC: { ...p.PLC, address_access: { ...p.PLC.address_access, read } } };
    });

  const addRow = () =>
    onChange((p) => ({
      ...p,
      PLC: {
        ...p.PLC,
        address_access: {
          ...p.PLC.address_access,
          read: [...(p.PLC.address_access?.read ?? []), normalizeSiemensRow({})],
        },
      },
    }));

  const removeRow = (i) =>
    onChange((p) => ({
      ...p,
      PLC: {
        ...p.PLC,
        address_access: {
          ...p.PLC.address_access,
          read: (p.PLC.address_access?.read ?? []).filter((_, idx) => idx !== i),
        },
      },
    }));

  return (
    <div className="space-y-5">

      {/* Credentials */}
      <div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Credentials</span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "IP Address", field: "ip",   type: "text",   placeholder: "192.168.0.1" },
            { label: "Rack",       field: "rack",  type: "number", placeholder: "0" },
            { label: "Slot",       field: "slot",  type: "number", placeholder: "2" },
          ].map(({ label, field, type, placeholder }) => (
            <div key={field}>
              <label className="text-[10px] text-slate-400 mb-1 block">{label}</label>
              <input
                type={type}
                value={plc.cred?.[field] ?? ""}
                placeholder={placeholder}
                disabled={isReadOnly}
                onChange={(e) => updCred(field, type === "number" ? Number(e.target.value) : e.target.value)}
                className={inp}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Polling */}
      <div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Polling Interval</span>
        <div className="flex items-center gap-2">
          <input
            type="number" min="0.1" step="0.1"
            value={displayFreq}
            disabled={isReadOnly}
            onChange={(e) => updFreqValue(e.target.value)}
            className={`${inp} w-28`}
          />
          <select
            value={plc.data_freq_unit ?? "sec"}
            disabled={isReadOnly}
            onChange={(e) => updFreqUnit(e.target.value)}
            className={`${inp} w-24`}
          >
            <option value="sec">Sec</option>
            <option value="min">Min</option>
            <option value="hour">Hour</option>
          </select>
        </div>
      </div>

      {/* DB Settings */}
      <DBSettings
        prefix="siemens"
        db={plc.Database}
        role={role}
        isReadOnly={isReadOnly}
        onChange={updDB}
      />

      {/* Tag Map */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tag Map</span>
          <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {rows.length} tag{rows.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs" style={{ minWidth: 900 }}>
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["Tag Name", "DB No.", "Address", "Type", "Size (auto)", "Min", "Max", "Output / Value", "Read", "Write", "Status", ""].map((h) => (
                  <th key={h} className={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={12} className="text-center py-8 text-slate-400 italic text-xs">
                    No tags configured. Click &quot;+ Add Tag&quot; to start.
                  </td>
                </tr>
              )}
              {rows.map((r, i) => {
                const typeInfo  = getTypeInfo(r.type);
                const isBool    = typeInfo.category === "bool";
                const isChar    = typeInfo.category === "char";
                const isNumeric = typeInfo.category === "numeric";
                const showWrite = !!r.write && (r.status ?? "Unassigned") === "Unassigned";
                const mode      = r.output_mode ?? "value";

                return (
                  <tr key={i} className="hover:bg-slate-50/60 transition-colors">

                    {/* Tag Name */}
                    <td className={td}>
                      <input
                        value={r.content ?? ""}
                        placeholder="Tag name"
                        disabled={isReadOnly}
                        onChange={(e) => updRow(i, "content", e.target.value)}
                        className={inp}
                      />
                    </td>

                    {/* DB No */}
                    <td className={td}>
                      <input
                        type="number"
                        value={r.DB_no ?? 0}
                        disabled={isReadOnly}
                        onChange={(e) => updRow(i, "DB_no", Number(e.target.value))}
                        className={`${inp} w-14`}
                      />
                    </td>

                    {/* Address */}
                    <td className={td}>
                      <input
                        type="number"
                        value={r.address ?? 0}
                        disabled={isReadOnly}
                        onChange={(e) => updRow(i, "address", Number(e.target.value))}
                        className={`${inp} w-16`}
                      />
                    </td>

                    {/* Type — full Siemens type list */}
                    <td className={td}>
                      <select
                        value={r.type ?? "REAL"}
                        disabled={isReadOnly}
                        onChange={(e) => updType(i, e.target.value)}
                        className={`${inp} w-24`}
                      >
                        {SIEMENS_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.value}</option>
                        ))}
                      </select>
                    </td>

                    {/* Size — auto-derived, read-only */}
                    <td className={td}>
                      <span className={`inline-block text-[10px] font-mono px-2 py-0.5 rounded ${
                        typeInfo.size === "dynamic"
                          ? "bg-amber-50 text-amber-600"
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        {typeInfo.size}
                      </span>
                    </td>

                    {/* Min */}
                    <td className={td}>
                      {showWrite && isNumeric
                        ? <input type="number" value={r.min ?? ""} disabled={isReadOnly}
                            onChange={(e) => updRow(i, "min", e.target.value)}
                            className={`${inp} w-16`} />
                        : <span className="text-slate-300 text-xs px-1">—</span>}
                    </td>

                    {/* Max */}
                    <td className={td}>
                      {showWrite && isNumeric
                        ? <input type="number" value={r.max ?? ""} disabled={isReadOnly}
                            onChange={(e) => updRow(i, "max", e.target.value)}
                            className={`${inp} w-16`} />
                        : <span className="text-slate-300 text-xs px-1">—</span>}
                    </td>

                    {/* Output / Value */}
                    <td className={td}>
                      {!showWrite ? (
                        <span className="text-slate-300 text-xs px-1">—</span>
                      ) : isBool ? (
                        // BOOL: always true / false select
                        <select
                          value={r.value ?? "true"}
                          disabled={isReadOnly}
                          onChange={(e) => updRow(i, "value", e.target.value)}
                          className={`${inp} w-20`}
                        >
                          <option value="true">true</option>
                          <option value="false">false</option>
                        </select>
                      ) : isChar ? (
                        // Character types: text input + hint
                        <div className="space-y-0.5">
                          <input
                            type="text"
                            value={r.value ?? ""}
                            disabled={isReadOnly}
                            placeholder={r.type === "CHAR" ? "A" : r.type === "WCHAR" ? "Ω" : "text…"}
                            onChange={(e) => updRow(i, "value", e.target.value)}
                            className={`${inp} w-28`}
                          />
                          <span className="text-[9px] text-indigo-500 leading-tight block">
                            {CHAR_HINTS[r.type] ?? "text input"}
                          </span>
                        </div>
                      ) : (
                        // Numeric: toggle between Output % and Value
                        <div className="space-y-1">
                          <div className="inline-flex rounded-md border border-slate-200 overflow-hidden">
                            {[
                              { key: "output_pct", label: "%" },
                              { key: "value",      label: "Val" },
                            ].map(({ key, label }) => (
                              <button
                                key={key}
                                type="button"
                                disabled={isReadOnly}
                                onClick={() => updRow(i, "output_mode", key)}
                                className={`px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                                  mode === key
                                    ? "bg-zinc-700 text-white"
                                    : "bg-white text-slate-400 hover:bg-slate-50"
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                          {mode === "output_pct" ? (
                            <input
                              type="number" min="0" max="100"
                              value={r.output_pct ?? ""}
                              placeholder="0–100 %"
                              disabled={isReadOnly}
                              onChange={(e) => updRow(i, "output_pct", e.target.value)}
                              className={`${inp} w-20 block`}
                            />
                          ) : (
                            <input
                              type="number"
                              value={r.value ?? ""}
                              placeholder="value"
                              disabled={isReadOnly}
                              onChange={(e) => updRow(i, "value", e.target.value)}
                              className={`${inp} w-20 block`}
                            />
                          )}
                        </div>
                      )}
                    </td>

                    {/* Read */}
                    <td className={`${td} text-center`}>
                      <input
                        type="checkbox"
                        checked={r.read !== false}
                        disabled={isReadOnly}
                        onChange={(e) => updRow(i, "read", e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-slate-300 accent-zinc-700"
                      />
                    </td>

                    {/* Write */}
                    <td className={`${td} text-center`}>
                      <input
                        type="checkbox"
                        checked={!!r.write}
                        disabled={isReadOnly}
                        onChange={(e) => updRow(i, "write", e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-slate-300 accent-zinc-700"
                      />
                    </td>

                    {/* Status */}
                    <td className={td}>
                      {!!r.write ? (
                        <select
                          value={r.status ?? "Unassigned"}
                          disabled={isReadOnly}
                          onChange={(e) => updRow(i, "status", e.target.value)}
                          className={`${inp} w-28`}
                        >
                          <option>Unassigned</option>
                          <option>Assigned</option>
                        </select>
                      ) : (
                        <span className="text-slate-300 text-xs px-1">—</span>
                      )}
                    </td>

                    {/* Delete */}
                    <td className={td}>
                      <button
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => removeRow(i)}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                        title="Remove row"
                      >
                        <X size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          disabled={isReadOnly}
          onClick={addRow}
          className="mt-2 w-full py-2 border border-dashed border-slate-300 rounded-xl text-xs font-semibold text-slate-500 hover:border-zinc-400 hover:text-zinc-700 hover:bg-white transition-colors disabled:opacity-50"
        >
          + Add Tag
        </button>
      </div>
    </div>
  );
}
