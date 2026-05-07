import React from "react";
import { X } from "lucide-react";

const inp = "w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 text-slate-700 disabled:bg-slate-50 disabled:text-slate-400";
const th = "text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-2 whitespace-nowrap";
const td = "px-2 py-1.5 align-middle";

const DATA_TYPES = ["STRING", "INT", "FLOAT", "BOOL", "DATETIME"];

export default function ScadaHmiForm({ device, onChange, isReadOnly, isScada = false }) {
  const fileStructure = device.file_structure ?? [];

  const upd = (field, value) =>
    onChange((d) => ({ ...d, [field]: value }));

  const updRow = (i, field, value) =>
    onChange((d) => {
      const fs = [...(d.file_structure ?? [])];
      fs[i] = { ...fs[i], [field]: value };
      return { ...d, file_structure: fs };
    });

  const addRow = () =>
    onChange((d) => ({
      ...d,
      file_structure: [...(d.file_structure ?? []), { field_name: "", data_type: "STRING", source: "" }],
    }));

  const removeRow = (i) =>
    onChange((d) => ({
      ...d,
      file_structure: (d.file_structure ?? []).filter((_, idx) => idx !== i),
    }));

  return (
    <div className="space-y-5">

      {/* System */}
      <div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">System</span>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-slate-400 mb-1 block">OS</label>
            <select
              value={device.os ?? "Windows"}
              disabled={isReadOnly}
              onChange={(e) => upd("os", e.target.value)}
              className={inp}
            >
              <option>Windows</option>
              <option>Linux</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 mb-1 block">Application Layer Protocol</label>
            <select
              value={device.protocol ?? "HTTP"}
              disabled={isReadOnly}
              onChange={(e) => upd("protocol", e.target.value)}
              className={inp}
            >
              <option>HTTP</option>
              <option>HTTPS</option>
              <option>OPC UA</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 mb-1 block">Username</label>
            <input
              type="text"
              value={device.username ?? ""}
              disabled={isReadOnly}
              onChange={(e) => upd("username", e.target.value)}
              className={inp}
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 mb-1 block">Password</label>
            <input
              type="password"
              value={device.password ?? ""}
              disabled={isReadOnly}
              onChange={(e) => upd("password", e.target.value)}
              className={inp}
            />
          </div>
          {isScada && (
            <div className="col-span-2">
              <label className="text-[10px] text-slate-400 mb-1 block">SCADA Software</label>
              <input
                type="text"
                value={device.scada_software ?? ""}
                placeholder="e.g. WinCC, Ignition, iFIX…"
                disabled={isReadOnly}
                onChange={(e) => upd("scada_software", e.target.value)}
                className={inp}
              />
            </div>
          )}
        </div>
      </div>

      {/* Network */}
      <div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Network</span>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-slate-400 mb-1 block">IP Address</label>
            <input
              type="text"
              value={device.ip ?? ""}
              placeholder="192.168.1.100"
              disabled={isReadOnly}
              onChange={(e) => upd("ip", e.target.value)}
              className={inp}
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 mb-1 block">Port</label>
            <input
              type="number"
              value={device.port ?? 80}
              disabled={isReadOnly}
              onChange={(e) => upd("port", Number(e.target.value))}
              className={inp}
            />
          </div>
        </div>
      </div>

      {/* File Storage */}
      <div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">File Storage</span>
        <div>
          <label className="text-[10px] text-slate-400 mb-1 block">Storage Location</label>
          <input
            type="text"
            value={device.file_storage_location ?? ""}
            placeholder="/data/logs"
            disabled={isReadOnly}
            onChange={(e) => upd("file_storage_location", e.target.value)}
            className={inp}
          />
        </div>
      </div>

      {/* File Structure */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">File Structure</span>
          <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {fileStructure.length} field{fileStructure.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs" style={{ minWidth: 480 }}>
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["Field Name", "Data Type", "Source", ""].map((h) => (
                  <th key={h} className={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {fileStructure.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-slate-400 italic text-xs">
                    No fields configured. Click &quot;+ Add Field&quot; to start.
                  </td>
                </tr>
              )}
              {fileStructure.map((f, i) => (
                <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                  <td className={td}>
                    <input
                      value={f.field_name ?? ""}
                      placeholder="field_name"
                      disabled={isReadOnly}
                      onChange={(e) => updRow(i, "field_name", e.target.value)}
                      className={inp}
                    />
                  </td>
                  <td className={td}>
                    <select
                      value={f.data_type ?? "STRING"}
                      disabled={isReadOnly}
                      onChange={(e) => updRow(i, "data_type", e.target.value)}
                      className={`${inp} w-28`}
                    >
                      {DATA_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </td>
                  <td className={td}>
                    <input
                      value={f.source ?? ""}
                      placeholder="source"
                      disabled={isReadOnly}
                      onChange={(e) => updRow(i, "source", e.target.value)}
                      className={inp}
                    />
                  </td>
                  <td className={td}>
                    <button
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => removeRow(i)}
                      className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                      title="Remove field"
                    >
                      <X size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          disabled={isReadOnly}
          onClick={addRow}
          className="mt-2 w-full py-2 border border-dashed border-slate-300 rounded-xl text-xs font-semibold text-slate-500 hover:border-zinc-400 hover:text-zinc-700 hover:bg-white transition-colors disabled:opacity-50"
        >
          + Add Field
        </button>
      </div>
    </div>
  );
}
