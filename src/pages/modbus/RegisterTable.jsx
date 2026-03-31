import React from "react";
import { Bell } from "lucide-react";

/**
 * RegisterTable – register row table for a Modbus RTU slave.
 *
 * Columns: S.No | Name | Start | Offset | Register Type | Sensor Type |
 *          Eng Symbol | Electrical Range | Data Type | Length | Multiply |
 *          Divide | Process Range | Set Point | Read | Write | Alert | Remove
 *
 * Lower Limit, Upper Limit, DO Pin, DO Status have moved into the Alert
 * Settings modal (opened via the bell button).
 */
export default function RegisterTable({
  rows,
  engineeringConfig,
  isSuperAdmin,   // kept for future use; alert modal handles superadmin fields
  isReadOnly,
  onRowChange,
  onRemoveRow,
  onAlertOpen,
}) {
  const engCfgList = engineeringConfig || [];

  const thCls = "px-3 py-2.5 text-left text-[11px] font-semibold text-zinc-300 uppercase tracking-wider whitespace-nowrap";
  const tdCls = "px-2 py-1.5 border-b border-slate-100";
  const inputCls = "border border-slate-200 rounded-md px-2 py-1 text-xs bg-white focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 w-full disabled:bg-slate-50 disabled:text-slate-400 text-slate-700";
  const selectCls = `${inputCls}`;

  return (
    <table className="w-full text-xs border-collapse" style={{ minWidth: 1100 }}>
      <thead>
        <tr className="bg-zinc-800">
          <th className={thCls}>#</th>
          <th className={thCls}>Name</th>
          <th className={thCls}>Start Addr</th>
          <th className={thCls}>Offset</th>
          <th className={thCls}>Register Type</th>
          <th className={thCls}>Sensor Type</th>
          <th className={thCls}>Eng Symbol</th>
          <th className={thCls}>Elec. Range</th>
          <th className={thCls}>Data Type</th>
          <th className={thCls}>Length</th>
          <th className={thCls}>Multiply</th>
          <th className={thCls}>Divide</th>
          <th className={thCls}>Process Range</th>
          <th className={`${thCls} text-center`}>Read</th>
          <th className={`${thCls} text-center`}>Write</th>
          <th className={`${thCls} text-center`}>Alert</th>
          <th className={`${thCls} text-center`}>Del</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const cfg = engCfgList.find((e) => e.type === r.sensor_type);
          const rowBg = i % 2 === 0 ? "bg-white" : "bg-gray-50/80";
          const hasAlert = !!r.alert?.enabled;

          return (
            <tr key={i} className={`${rowBg} hover:bg-zinc-50/80 transition-colors group`}>
              {/* S.No */}
              <td className={`${tdCls} text-center text-slate-400 font-medium w-8`}>{i + 1}</td>

              {/* Name */}
              <td className={tdCls}>
                <input
                  type="text"
                  value={r.name ?? ""}
                  disabled={isReadOnly}
                  style={{ width: 160 }}
                  onChange={(e) => onRowChange(i, "name", e.target.value)}
                  className={inputCls}
                />
              </td>

              {/* Start Address */}
              <td className={tdCls}>
                <input
                  type="number"
                  value={r.start ?? ""}
                  disabled={isReadOnly}
                  style={{ width: 80 }}
                  onChange={(e) => onRowChange(i, "start", e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                  className={inputCls}
                />
              </td>

              {/* Offset */}
              <td className={tdCls}>
                <input
                  type="number"
                  value={r.offset ?? 0}
                  disabled={isReadOnly}
                  style={{ width: 60 }}
                  onChange={(e) => onRowChange(i, "offset", parseInt(e.target.value, 10) || 0)}
                  className={inputCls}
                />
              </td>

              {/* Register Type */}
              <td className={tdCls}>
                <select
                  value={r.type ?? "Input Register"}
                  disabled={isReadOnly}
                  onChange={(e) => onRowChange(i, "type", e.target.value)}
                  className={selectCls}
                  style={{ width: 130 }}
                >
                  <option>Coil</option>
                  <option>Discrete Input</option>
                  <option>Holding Register</option>
                  <option>Input Register</option>
                </select>
              </td>

              {/* Sensor Type */}
              <td className={tdCls}>
                <select
                  value={r.sensor_type ?? ""}
                  disabled={isReadOnly}
                  onChange={(e) => {
                    const newType = e.target.value;
                    const newCfg = engCfgList.find((ec) => ec.type === newType);
                    onRowChange(i, { sensor_type: newType, eng_symbol: newCfg?.symbols?.[0] ?? "" });
                  }}
                  className={selectCls}
                  style={{ width: 110 }}
                >
                  <option value="">— Select —</option>
                  {engCfgList.map((ec) => (
                    <option key={ec.type} value={ec.type}>{ec.type}</option>
                  ))}
                </select>
              </td>

              {/* Engineering Symbol */}
              <td className={tdCls}>
                {cfg && cfg.symbols.length > 0 ? (
                  <select
                    value={r.eng_symbol ?? ""}
                    disabled={isReadOnly}
                    onChange={(e) => onRowChange(i, "eng_symbol", e.target.value)}
                    className={selectCls}
                    style={{ width: 80 }}
                  >
                    {cfg.symbols.map((sym) => (
                      <option key={sym} value={sym}>{sym}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </td>

              {/* Electrical Range (eng_unit) */}
              <td className={tdCls}>
                <select
                  value={r.eng_unit ?? "4-20mA"}
                  disabled={isReadOnly}
                  onChange={(e) => onRowChange(i, "eng_unit", e.target.value)}
                  className={selectCls}
                  style={{ width: 100 }}
                >
                  <option value="4-20mA">4–20 mA</option>
                  <option value="0-20mA">0–20 mA</option>
                  <option value="0-10V">0–10 V</option>
                  <option value="0-5V">0–5 V</option>
                  <option value="1-5V">1–5 V</option>
                  <option value="none">Modbus RTU</option>
                </select>
              </td>

              {/* Data Type (sql_type) */}
              <td className={tdCls}>
                <select
                  value={r.sql_type ?? "FLOAT"}
                  disabled={isReadOnly}
                  onChange={(e) => onRowChange(i, "sql_type", e.target.value)}
                  className={selectCls}
                  style={{ width: 90 }}
                >
                  <option>FLOAT</option>
                  <option>INT</option>
                  <option>BIGINT</option>
                  <option>VARCHAR</option>
                  <option>BOOLEAN</option>
                </select>
              </td>

              {/* Length */}
              <td className={tdCls}>
                <input
                  type="number"
                  value={r.length ?? 2}
                  disabled={isReadOnly}
                  style={{ width: 55 }}
                  onChange={(e) => onRowChange(i, "length", parseInt(e.target.value, 10) || 2)}
                  className={inputCls}
                />
              </td>

              {/* Multiply */}
              <td className={tdCls}>
                <input
                  type="number"
                  step="any"
                  value={r.multiply ?? 1}
                  disabled={isReadOnly}
                  style={{ width: 65 }}
                  onChange={(e) => onRowChange(i, "multiply", parseFloat(e.target.value) || 1)}
                  className={inputCls}
                />
              </td>

              {/* Divide */}
              <td className={tdCls}>
                <input
                  type="number"
                  step="any"
                  value={r.divide ?? 1}
                  disabled={isReadOnly}
                  style={{ width: 65 }}
                  onChange={(e) => onRowChange(i, "divide", parseFloat(e.target.value) || 1)}
                  className={inputCls}
                />
              </td>

              {/* Process Range (min / max) */}
              <td className={tdCls}>
                <div className="flex gap-1">
                  <input
                    type="number"
                    placeholder="Min"
                    style={{ width: 60 }}
                    value={r.process_min ?? ""}
                    disabled={isReadOnly}
                    onChange={(e) => onRowChange(i, "process_min", e.target.value)}
                    className={inputCls}
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    style={{ width: 60 }}
                    value={r.process_max ?? ""}
                    disabled={isReadOnly}
                    onChange={(e) => onRowChange(i, "process_max", e.target.value)}
                    className={inputCls}
                  />
                </div>
              </td>

 

              {/* Read */}
              <td className={`${tdCls} text-center`}>
                <input
                  type="checkbox"
                  checked={!!r.read}
                  disabled={isReadOnly}
                  onChange={(e) => onRowChange(i, "read", e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 accent-zinc-700 cursor-pointer"
                />
              </td>

              {/* Write */}
              <td className={`${tdCls} text-center`}>
                <input
                  type="checkbox"
                  checked={!!r.write}
                  disabled={isReadOnly}
                  onChange={(e) => onRowChange(i, "write", e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 accent-zinc-700 cursor-pointer"
                />
              </td>

              {/* Alert Settings */}
              <td className={`${tdCls} text-center`}>
                <button
                  type="button"
                  title="Alert Settings"
                  onClick={() => onAlertOpen(i)}
                  className={`inline-flex items-center justify-center p-1.5 rounded-md transition-colors ${
                    hasAlert
                      ? "bg-amber-100 text-amber-600 hover:bg-amber-200"
                      : "text-slate-700 hover:text-amber-500 hover:bg-amber-50"
                  }`}
                >
                  <Bell size={13} strokeWidth={hasAlert ? 2.5 : 1.5} />
                </button>
              </td>

              {/* Remove */}
              <td className={`${tdCls} text-center`}>
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => onRemoveRow(i)}
                  className="inline-flex items-center justify-center p-1.5 rounded-md text-red-700 bg-rose-50 transition-colors disabled:opacity-30"
                >
                  ×
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
