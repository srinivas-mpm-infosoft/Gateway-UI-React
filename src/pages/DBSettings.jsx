import React from 'react';

export default function DBSettings({ prefix, db, role }) {
  // Fallback defaults if db is undefined
  const currentDb = db || {
    upload_local: true,
    upload_cloud: false,
    db_name: "",
    table_name: "",
  };

  const isPrivilegedRole = role === "admin" || role === "superadmin";

  return (
    <div style={{ marginTop: '12px', padding: '8px', border: '1px solid #ccc' }}>
      <b>Database Settings</b>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '6px' }}>
        <label>
          <input 
            type="checkbox" 
            name={`${prefix}_upload_local`}
            defaultChecked={currentDb.upload_local} 
          />
          Local DB
        </label>

        <label>
          <input 
            type="checkbox" 
            name={`${prefix}_upload_cloud`}
            defaultChecked={currentDb.upload_cloud} 
          />
          Cloud DB
        </label>

        {isPrivilegedRole ? (
          <>
            <label>
              <b>Database Name</b>
              <input 
                type="text"
                name={`${prefix}_db_name`}
                placeholder="Database name"
                defaultValue={currentDb.db_name || "ifex_demo"}
                style={{ width: '140px' }}
              />
            </label>

            <label>
              <b>Table Name</b>
              <input 
                type="text"
                name={`${prefix}_table_name`}
                placeholder="Table name"
                defaultValue={currentDb.table_name || ""}
                style={{ width: '140px' }}
              />
            </label>
          </>
        ) : (
          <>
            <input 
              type="hidden" 
              name={`${prefix}_db_name`} 
              value={currentDb.db_name || "ifex_demo"} 
            />
            <input 
              type="hidden" 
              name={`${prefix}_table_name`} 
              value={currentDb.table_name || ""} 
            />
          </>
        )}
      </div>
    </div>
  );
}