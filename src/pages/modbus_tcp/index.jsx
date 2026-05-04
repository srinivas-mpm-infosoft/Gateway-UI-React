import React, { useEffect, useState } from "react";
import { useToast } from "../../components/ToastContext";
import PlcCard from "./PlcCard";
import { deepClone, ensureBase, normalizePlcEntry } from "./helpers";

export default function ModbusTCP({ config, onSave, setConfig, role = "admin", isReadOnly }) {
  const showToast = useToast();
  const [localCfg, setLocalCfg] = useState(() => ensureBase(config));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalCfg(ensureBase(config));
  }, [config]);

  const plcs = localCfg.plc_configurations ?? [];

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------
  const save = async () => {
    if (isReadOnly) return;
    setIsSaving(true);
    try {
      await onSave(localCfg);
      setConfig?.(localCfg);
      showToast("Modbus TCP settings saved!", "success");
    } catch (err) {
      console.error(err);
      showToast("Save failed", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // PLC management
  // ---------------------------------------------------------------------------
  const addPlc = () => {
    setLocalCfg((prev) => {
      const next = deepClone(prev);
      next.plc_configurations.push(
        normalizePlcEntry({ plcType: "Siemens", isExpanded: true, enabled: true })
      );
      return next;
    });
  };

  const removePlc = (i) => {
    if (!window.confirm("Remove this PLC configuration?")) return;
    setLocalCfg((prev) => {
      const next = deepClone(prev);
      next.plc_configurations.splice(i, 1);
      return next;
    });
  };

  const toggleExpand = (i) => {
    setLocalCfg((prev) => {
      const next = deepClone(prev);
      next.plc_configurations[i].isExpanded = !next.plc_configurations[i].isExpanded;
      return next;
    });
  };

  // Switching PLC type resets the PLC data to a clean normalized state
  const updatePlcType = (i, plcType) => {
    setLocalCfg((prev) => {
      const next = deepClone(prev);
      next.plc_configurations[i] = normalizePlcEntry({
        plcType,
        isExpanded: true,
        enabled: next.plc_configurations[i].enabled ?? true,
      });
      return next;
    });
  };

  // Accepts either a plain patch object or a function updater (p) => newEntry
  const updatePlc = (i, updater) => {
    setLocalCfg((prev) => {
      const next = deepClone(prev);
      next.plc_configurations[i] =
        typeof updater === "function"
          ? updater(next.plc_configurations[i])
          : { ...next.plc_configurations[i], ...updater };
      return next;
    });
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-0">

      {/* Page Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold text-slate-700">Modbus TCP</h2>
          <p className="text-xs text-slate-400 mt-0.5">Configure PLC connections and tag mappings</p>
        </div>
        <button
          disabled={isReadOnly || isSaving}
          onClick={save}
          className="inline-flex items-center gap-2 px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
      </div>

      {/* PLC list */}
      <div className="space-y-4">
        {plcs.length === 0 && (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-400 text-sm">
            No PLCs configured. Click &quot;+ Add PLC&quot; to get started.
          </div>
        )}

        {plcs.map((plc, i) => (
          <PlcCard
            key={i}
            plc={plc}
            index={i}
            role={role}
            isReadOnly={isReadOnly}
            onToggle={() => toggleExpand(i)}
            onTypeChange={(t) => updatePlcType(i, t)}
            onUpdate={(updater) => updatePlc(i, updater)}
            onRemove={() => removePlc(i)}
          />
        ))}

        <button
          type="button"
          disabled={isReadOnly}
          onClick={addPlc}
          className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-dashed border-slate-300 hover:border-zinc-400 hover:bg-white rounded-xl text-sm font-medium text-slate-500 hover:text-zinc-700 transition-colors disabled:opacity-50"
        >
          + Add PLC
        </button>
      </div>
    </div>
  );
}
