import React, { useState, useEffect } from "react";
import AnalogIO from "./AnalogIO";
import DBSettings from "./DBSettings";
import DigitalIO from "./DigitalIO";
import ModbusRTU from "./ModbusRTU";
import ModbusTCP from "./ModbusTCP";

export default function IOSettings() {
  const [config, setConfig] = useState(null);
  const [subTab, setSubTab] = useState("Settings");
  const [loading, setLoading] = useState(true);

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
    const res = await fetch("/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedConfig),
    });
    if (res.ok) {
      alert("Saved!");
      setConfig(updatedConfig);
    }
  };

  // Logic Helpers
  const getAnalogMin = (r) => (r && r.includes(":") ? r.split(":")[0] : "");
  const getAnalogMax = (r) => {
    const m = r?.match(/-?\d+(\.\d+)?/g);
    return m && m.length > 1 ? m[1] : "";
  };

  if (loading) return <div className="p-10">Loading System Config...</div>;
  if (!config)
    return (
      <div className="p-10 text-red-500">
        Error: Could not connect to gateway.
      </div>
    );

  return (
    <div className="io-settings-container">
      <div className="panel-header">I/O Settings</div>

      <div className="tab-list">
        {["Settings", "Analog I/O", "Digital I/O", "Modbus RTU", "Modbus TCP"].map((t) => (
          <button
            key={t}
            className={`tab-btn ${subTab === t ? "active" : ""}`}
            onClick={() => setSubTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="tab-content">
          {subTab === "Settings" && (
            <form
              id="io-settings-form"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                const nc = JSON.parse(JSON.stringify(config));
                nc.ioSettings.settings.modbus = fd.get("modbus") === "on";
                nc.ioSettings.settings.modbusTCP = fd.get("modbusTCP") === "on";
                nc.ioSettings.settings.analog = fd.get("analog") === "on";
                nc.ioSettings.settings.digitalInput =
                  fd.get("digitalInput") === "on";
                saveConfig(nc);
              }}
            >
              <label>
                <input
                  type="checkbox"
                  name="modbus"
                  defaultChecked={config.ioSettings.settings?.modbus}
                />{" "}
                Modbus RTU
              </label>
              <br />
              <label>
                <input
                  type="checkbox"
                  name="modbusTCP"
                  defaultChecked={config.ioSettings.settings?.modbusTCP}
                />{" "}
                Modbus TCP
              </label>
              <br />
              <label>
                <input
                  type="checkbox"
                  name="analog"
                  defaultChecked={config.ioSettings.settings?.analog}
                />{" "}
                Analog I/O
              </label>
              <br />
              <label>
                <input
                  type="checkbox"
                  name="digitalInput"
                  defaultChecked={config.ioSettings.settings?.digitalInput}
                />{" "}
                Digital I/O
              </label>
              <br />
              <br />
              <button className="button-primary" type="submit">
                Save Settings
              </button>
            </form>
          )}

        {subTab === "Analog I/O" && (
          <AnalogIO
            config={config}
            setConfig={setConfig}
            onSave={saveConfig}
            getAnalogMin={getAnalogMin}
            getAnalogMax={getAnalogMax}
          />
        )}


        {subTab === "Digital I/O" && (
          <DigitalIO config={config} onSave={saveConfig} setConfig={setConfig} />
        )}

                {subTab === "Modbus RTU" && (
          <ModbusRTU config={config} onSave={saveConfig} setConfig={setConfig} />
        )}

                {subTab === "Modbus TCP" && (
          <ModbusTCP config={config} onSave={saveConfig} setConfig={setConfig} />
        )}
      </div>
    </div>
  );
}
