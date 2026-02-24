import React from 'react';
import DBSettings from './DBSettings';

export default function AnalogIO({ config, setConfig, onSave, getAnalogMin, getAnalogMax }) {
  const io = config.ioSettings;
  const a = io.analog;

  const handleLocalSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const newConfig = JSON.parse(JSON.stringify(config)); // Deep clone
    const analog = newConfig.ioSettings.analog;

    analog.pollingInterval = parseInt(fd.get("pollingInterval"), 10);
    analog.pollingIntervalUnit = fd.get("intervalUnit");

    // Map AI Channels
    analog.channels = analog.channels.map((ch, i) => {
      const min = fd.get(`ai_min_${i}`);
      const max = fd.get(`ai_max_${i}`);
      const mode = fd.get(`ai_mode_${i}`);
      const symbol = mode.includes("mA") ? "mA" : "V";
      return {
        ...ch,
        name: fd.get(`ai_name_${i}`) || `AI${i+1}`,
        enabled: fd.get(`ai_enable_${i}`) === "on",
        mode,
        range: (min !== "" && max !== "") ? `${min}:${max}${symbol}` : "",
        address: fd.get(`ai_address_${i}`) || ""
      };
    });

    // Handle DB settings from FormData via the DBSettings component names
    analog.db.upload_local = fd.get("analog_upload_local") === "on";
    analog.db.upload_cloud = fd.get("analog_upload_cloud") === "on";
    analog.db.db_name = fd.get("analog_db_name");
    analog.db.table_name = fd.get("analog_table_name");

    onSave(newConfig);
  };

  return (
    <form id="analog-form" onSubmit={handleLocalSubmit}>
      <h3>Analog Input</h3>
      <div style={{ marginBottom: '15px' }}>
        <label><input type="radio" name="intervalUnit" value="Sec" defaultChecked={a.pollingIntervalUnit === "Sec"} /> Sec</label>
        <label style={{ marginLeft: '10px' }}><input type="radio" name="intervalUnit" value="Min" defaultChecked={a.pollingIntervalUnit === "Min"} /> Min</label>
        &nbsp; Polling: 
        <input type="number" name="pollingInterval" defaultValue={a.pollingInterval} style={{ width: '60px', marginLeft: '5px' }} />
      </div>

      <table className="channel-table">
        <thead>
          <tr>
            <th>Channel</th><th>Name</th><th>Enable</th><th>Mode</th><th>Min</th><th>Max</th><th>Address</th>
          </tr>
        </thead>
        <tbody>
          {a.channels.map((ch, i) => (
            <tr key={i}>
              <td>AI {i + 1}</td>
              <td><input name={`ai_name_${i}`} defaultValue={ch.name} /></td>
              <td><input type="checkbox" name={`ai_enable_${i}`} defaultChecked={ch.enabled} /></td>
              <td>
                <select name={`ai_mode_${i}`} defaultValue={ch.mode}>
                  <option value="0.-2.048V">0–2.048V</option>
                  <option value="4-20mA">4–20mA</option>
                </select>
              </td>
              <td><input type="number" step="any" name={`ai_min_${i}`} defaultValue={getAnalogMin(ch.range)} style={{width:'80px'}} /></td>
              <td><input type="number" step="any" name={`ai_max_${i}`} defaultValue={getAnalogMax(ch.range)} style={{width:'80px'}} /></td>
              <td><input name={`ai_address_${i}`} defaultValue={ch.address} style={{width:'60px'}} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <DBSettings prefix="analog" db={a.db} role="admin" />
      
      <br />
      <button className="button-primary" type="submit">Save Analog Settings</button>
    </form>
  );
}