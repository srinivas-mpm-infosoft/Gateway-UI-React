import React, { useState, useEffect, useCallback } from "react";
import {
  Users, Shield, Plus, Edit2, Trash2, Loader2,
  Eye, EyeOff, Check, X, Save, RefreshCw, AlertCircle,
} from "lucide-react";
import { targetUrl } from "../config";
import { useToast } from "../components/ToastContext";
import { useAuthStore } from "../store/useAuthStore";

const LABEL = "text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block";
const INPUT = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 text-slate-700";
const BTN_PRIMARY = "inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors";
const BTN_SECONDARY = "inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors";
const BTN_DANGER = "inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors";

export const ROLES = [
  { id: "administrator",          label: "Administrator" },
  { id: "plant_manager",          label: "Plant Manager" },
  { id: "process_engineer",       label: "Process Engineer" },
  { id: "shift_supervisor",       label: "Shift Supervisor" },
  { id: "operator",               label: "Operator" },
  { id: "maintenance_technician", label: "Maintenance Tech" },
  { id: "auditor",                label: "Auditor" },
];

export const PERMISSIONS = [
  // I/O Settings
  { id: "io.general.view",          label: "View General",          category: "I/O Settings" },
  { id: "io.general.configure",     label: "Configure General",     category: "I/O Settings" },
  { id: "io.modbus_rtu.view",       label: "View Modbus RTU",       category: "I/O Settings" },
  { id: "io.modbus_rtu.configure",  label: "Configure Modbus RTU",  category: "I/O Settings" },
  { id: "io.plc.view",              label: "View PLC",              category: "I/O Settings" },
  { id: "io.plc.configure",         label: "Configure PLC",         category: "I/O Settings" },
  { id: "io.scada.view",            label: "View SCADA PC",         category: "I/O Settings" },
  { id: "io.scada.configure",       label: "Configure SCADA PC",    category: "I/O Settings" },
  { id: "io.hmi.view",              label: "View HMI",              category: "I/O Settings" },
  { id: "io.hmi.configure",         label: "Configure HMI",         category: "I/O Settings" },
  // Network
  { id: "wifi.view",                label: "View WiFi / 4G",        category: "Network" },
  { id: "wifi.configure",           label: "Configure WiFi / 4G",   category: "Network" },
  // Data Storage
  { id: "database.view",            label: "View Data Storage",     category: "Data Storage" },
  { id: "database.configure",       label: "Configure Data Storage",category: "Data Storage" },
  { id: "remotedb.view",            label: "View MSSQL Connectivity",   category: "Data Storage" },
  { id: "remotedb.configure",       label: "Configure MSSQL Connectivity", category: "Data Storage" },
  // Administration
  { id: "admin.view",               label: "View Admin Settings",   category: "Administration" },
  { id: "admin.configure",          label: "Configure Admin Settings", category: "Administration" },
  { id: "users.view",               label: "View Users",            category: "Administration" },
  { id: "users.manage",             label: "Manage Users",          category: "Administration" },
];

const ROLE_BADGES = {
  administrator:          "bg-red-100 text-red-700",
  plant_manager:          "bg-orange-100 text-orange-700",
  process_engineer:       "bg-amber-100 text-amber-700",
  shift_supervisor:       "bg-blue-100 text-blue-700",
  operator:               "bg-emerald-100 text-emerald-700",
  maintenance_technician: "bg-purple-100 text-purple-700",
  auditor:                "bg-slate-100 text-slate-600",
};

const BLANK_USER = {
  username: "", password: "", confirm_password: "",
  role: "operator", status: "Active",
};

const TABS = [
  { id: "users",  label: "Users",              icon: Users  },
  { id: "roles",  label: "Roles & Permissions",icon: Shield },
];

function apiFetch(path, opts = {}) {
  return fetch(`${targetUrl}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...opts,
  }).then((r) => r.json());
}

function RoleBadge({ role }) {
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${ROLE_BADGES[role] ?? "bg-slate-100 text-slate-600"}`}>
      {role.replace(/_/g, " ")}
    </span>
  );
}

function ConfirmModal({ open, title, message, confirmLabel = "Confirm", onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-1100 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 z-10">
        <h3 className="font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-5">{message}</p>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className={BTN_SECONDARY}>Cancel</button>
          <button type="button" onClick={onConfirm} className={BTN_DANGER}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export default function UserManagement({ user }) {
  const showToast = useToast();
  const setRolePermissions = useAuthStore((s) => s.setRolePermissions);

  const userRole = user?.role ?? "";
  const isAdmin = userRole === "administrator" || userRole === "superadmin";

  const [tab, setTab] = useState("users");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [rolePerms, setRolePerms] = useState(null);
  const [dirtyRoles, setDirtyRoles] = useState(new Set());
  const [saving, setSaving] = useState(false);

  const [modal, setModal] = useState(null);
  const [formData, setFormData] = useState({ ...BLANK_USER });
  const [formErrors, setFormErrors] = useState({});
  const [showPw, setShowPw] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, rpRes] = await Promise.all([
        apiFetch("/users"),
        apiFetch("/roles/permissions"),
      ]);
      if (uRes.ok) setUsers(uRes.data);
      if (rpRes.ok) setRolePerms(rpRes.data);
    } catch {
      showToast("Failed to connect to backend", "error");
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => { if (isAdmin) loadAll(); }, [isAdmin, loadAll]);

  const closeModal = () => {
    setModal(null);
    setFormData({ ...BLANK_USER });
    setFormErrors({});
    setShowPw(false);
  };

  const openCreate = () => {
    setFormData({ ...BLANK_USER });
    setModal({ mode: "create" });
  };

  const openEdit = (u) => {
    setFormData({
      username: u.username,
      password: "",
      confirm_password: "",
      role: u.role,
      status: u.status,
      _id: u.id,
    });
    setModal({ mode: "edit" });
  };

  const setField = (k, v) => setFormData((p) => ({ ...p, [k]: v }));

  const validate = () => {
    const errs = {};
    if (modal?.mode === "create") {
      if (!formData.username.trim()) errs.username = "Username required";
      if (!formData.password) errs.password = "Password required";
    }
    if (formData.password && formData.password !== formData.confirm_password)
      errs.confirm = "Passwords do not match";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    const { confirm_password, _id, ...payload } = formData;
    const res = await apiFetch("/users", { method: "POST", body: JSON.stringify(payload) });
    if (res.ok) {
      setUsers((prev) => [res.data, ...prev]);
      showToast("User created", "success");
      closeModal();
    } else {
      showToast(res.error || "Failed to create user", "error");
    }
  };

  const handleUpdate = async () => {
    if (!validate()) return;
    const { username, confirm_password, _id, ...payload } = formData;
    if (!payload.password) delete payload.password;
    const res = await apiFetch(`/users/${_id}`, { method: "PUT", body: JSON.stringify(payload) });
    if (res.ok) {
      setUsers((prev) => prev.map((u) => u.id === _id ? res.data : u));
      showToast("User updated", "success");
      closeModal();
    } else {
      showToast(res.error || "Failed to update user", "error");
    }
  };

  const handleDelete = async () => {
    const res = await apiFetch(`/users/${deleteTarget}`, { method: "DELETE" });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget));
      showToast("User deleted", "success");
    } else {
      showToast("Delete failed", "error");
    }
    setDeleteTarget(null);
  };

  const toggleStatus = async (u) => {
    const newStatus = u.status === "Active" ? "Disabled" : "Active";
    const res = await apiFetch(`/users/${u.id}`, {
      method: "PUT", body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok)
      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, status: newStatus } : x));
  };

  const togglePerm = (role, permId) => {
    if (role === "administrator") return;
    setRolePerms((prev) => {
      const current = prev[role] ?? [];
      const next = current.includes(permId)
        ? current.filter((p) => p !== permId)
        : [...current, permId];
      return { ...prev, [role]: next };
    });
    setDirtyRoles((s) => new Set([...s, role]));
  };

  const saveRolePerms = async () => {
    setSaving(true);
    let ok = true;
    for (const role of dirtyRoles) {
      const res = await apiFetch(`/roles/permissions/${role}`, {
        method: "PUT", body: JSON.stringify({ permissions: rolePerms[role] }),
      });
      if (!res.ok) { ok = false; showToast(`Failed to save ${role}`, "error"); }
    }
    if (ok) {
      showToast("Role permissions saved", "success");
      setDirtyRoles(new Set());
      setRolePermissions?.(rolePerms);
    }
    setSaving(false);
  };

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-xl">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center gap-4 text-red-700">
          <AlertCircle size={24} />
          <div>
            <h3 className="font-bold">Access Denied</h3>
            <p className="text-sm">User Management is restricted to administrators.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-5 min-h-full">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Users className="h-6 w-6 text-indigo-600" />
          User Management
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage users, roles, and access permissions</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex border-b border-slate-100" role="tablist">
          {TABS.map((t) => {
            const Icon = t.icon;
            const dirty = t.id === "roles" && dirtyRoles.size > 0;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors focus:outline-none ${
                  tab === t.id ? "border-b-2 border-indigo-600 text-indigo-700" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon size={14} />
                {t.label}
                {dirty && <span className="w-2 h-2 rounded-full bg-amber-500 ml-0.5" title="Unsaved changes" />}
              </button>
            );
          })}
        </div>

        {/* ── Users Tab ── */}
        {tab === "users" && (
          <div className="p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{users.length} user{users.length !== 1 ? "s" : ""}</p>
              <div className="flex gap-2">
                <button type="button" onClick={loadAll} className={BTN_SECONDARY}>
                  <RefreshCw size={13} />Refresh
                </button>
                <button type="button" onClick={openCreate} className={BTN_PRIMARY}>
                  <Plus size={14} />New User
                </button>
              </div>
            </div>

            {loading
              ? <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-indigo-600" /></div>
              : (
                <div className="overflow-x-auto rounded-lg border border-slate-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        {["Username", "Role", "Last Login", "Status", "Actions"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {users.length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm">No users found</td></tr>
                      )}
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-800">{u.username}</td>
                          <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                          <td className="px-4 py-3 text-xs text-slate-400">
                            {u.last_login ? new Date(u.last_login).toLocaleString() : "Never"}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => toggleStatus(u)}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
                                u.status === "Active"
                                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                              }`}
                            >
                              {u.status}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => openEdit(u)}
                                className="p-1.5 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                                title="Edit user"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(u.id)}
                                className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600"
                                title="Delete user"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            }
          </div>
        )}

        {/* ── Roles & Permissions Tab ── */}
        {tab === "roles" && (
          <div className="p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-medium text-slate-700">Click a cell to toggle. Administrator always has full access.</p>
                {dirtyRoles.size > 0 && (
                  <p className="text-xs text-amber-600 mt-0.5">{dirtyRoles.size} role{dirtyRoles.size > 1 ? "s" : ""} with unsaved changes</p>
                )}
              </div>
              <button type="button" onClick={saveRolePerms} disabled={dirtyRoles.size === 0 || saving} className={BTN_PRIMARY}>
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {saving ? "Saving…" : "Save Permissions"}
              </button>
            </div>

            {!rolePerms
              ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div>
              : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b-2 border-slate-200">
                        <th className="px-4 py-3 text-left font-bold text-slate-700 text-[11px] uppercase tracking-wide w-52 sticky left-0 bg-slate-100">
                          Permission
                        </th>
                        {ROLES.map((r) => (
                          <th key={r.id} className="px-2 py-3 text-center text-[10px] uppercase tracking-wide whitespace-nowrap min-w-[90px]">
                            <div className="flex flex-col items-center gap-1.5">
                              <RoleBadge role={r.id} />
                              {dirtyRoles.has(r.id) && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" title="Unsaved" />
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(() => {
                        let lastCat = null;
                        return PERMISSIONS.map((perm) => {
                          const catHeader = perm.category !== lastCat;
                          lastCat = perm.category;
                          return (
                            <React.Fragment key={perm.id}>
                              {catHeader && (
                                <tr className="bg-slate-50">
                                  <td colSpan={ROLES.length + 1} className="px-4 py-2">
                                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{perm.category}</span>
                                  </td>
                                </tr>
                              )}
                              <tr className="hover:bg-indigo-50/30 transition-colors">
                                <td className="px-4 py-2.5 text-slate-800 font-medium sticky left-0 bg-white">
                                  {perm.label}
                                </td>
                                {ROLES.map((role) => {
                                  const has = (rolePerms[role.id] ?? []).includes(perm.id);
                                  const isLocked = role.id === "administrator";
                                  return (
                                    <td key={role.id} className="px-2 py-2.5 text-center">
                                      <button
                                        type="button"
                                        onClick={() => togglePerm(role.id, perm.id)}
                                        disabled={isLocked}
                                        className={`mx-auto flex items-center justify-center w-6 h-6 rounded-md border-2 transition-all ${
                                          isLocked
                                            ? "bg-indigo-600 border-indigo-600 text-white cursor-default"
                                            : has
                                              ? "bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600 cursor-pointer shadow-sm"
                                              : "border-slate-300 bg-white text-slate-300 hover:border-rose-400 hover:bg-rose-50 cursor-pointer"
                                        }`}
                                        title={isLocked ? "Always granted" : has ? "Click to revoke" : "Click to grant"}
                                        aria-pressed={has}
                                      >
                                        {(has || isLocked) ? <Check size={12} strokeWidth={3} /> : <X size={11} strokeWidth={2.5} />}
                                      </button>
                                    </td>
                                  );
                                })}
                              </tr>
                            </React.Fragment>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              )
            }

            <div className="flex items-center gap-5 text-xs text-slate-500 pt-1 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-md bg-indigo-600 border-2 border-indigo-600 inline-flex items-center justify-center"><Check size={10} className="text-white" strokeWidth={3} /></span>
                Admin (locked)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-md bg-emerald-500 border-2 border-emerald-500 inline-flex items-center justify-center"><Check size={10} className="text-white" strokeWidth={3} /></span>
                Granted
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-md bg-white border-2 border-slate-300 inline-flex items-center justify-center"><X size={10} className="text-slate-400" strokeWidth={2.5} /></span>
                Not granted
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-1000 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 z-10 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">
                {modal.mode === "create" ? "New User" : `Edit: ${formData.username}`}
              </h3>
              <button type="button" onClick={closeModal} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">&times;</button>
            </div>

            <div className="flex flex-col gap-4">
              {modal.mode === "create" && (
                <div>
                  <label className={LABEL} htmlFor="mu-user">Username</label>
                  <input id="mu-user" className={INPUT} value={formData.username}
                    onChange={(e) => setField("username", e.target.value)} placeholder="jsmith" />
                  {formErrors.username && <p className="text-red-500 text-xs mt-1">{formErrors.username}</p>}
                </div>
              )}

              <div>
                <label className={LABEL} htmlFor="mu-pw">{modal.mode === "edit" ? "New Password (optional)" : "Password"}</label>
                <div className="relative">
                  <input id="mu-pw" type={showPw ? "text" : "password"} className={INPUT}
                    value={formData.password}
                    onChange={(e) => setField("password", e.target.value)}
                    placeholder={modal.mode === "edit" ? "Leave blank to keep current" : "Min 8 characters"} />
                  <button type="button" onClick={() => setShowPw((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {formErrors.password && <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>}
              </div>

              <div>
                <label className={LABEL} htmlFor="mu-confirm">Confirm Password</label>
                <input id="mu-confirm" type="password" className={INPUT}
                  value={formData.confirm_password}
                  onChange={(e) => setField("confirm_password", e.target.value)} />
                {formErrors.confirm && <p className="text-red-500 text-xs mt-1">{formErrors.confirm}</p>}
              </div>

              <div>
                <label className={LABEL}>Role</label>
                <div className="space-y-1">
                  {ROLES.map((r) => (
                    <label key={r.id} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg border border-transparent hover:border-slate-200 hover:bg-slate-50">
                      <input type="radio" name="mu-role" value={r.id}
                        checked={formData.role === r.id}
                        onChange={() => setField("role", r.id)}
                        className="text-indigo-600" />
                      <RoleBadge role={r.id} />
                      <span className="text-sm text-slate-600">{r.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {modal.mode === "edit" && (
                <div>
                  <label className={LABEL}>Status</label>
                  <div className="flex gap-3">
                    {["Active", "Disabled"].map((s) => (
                      <label key={s} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="mu-status" value={s}
                          checked={formData.status === s}
                          onChange={() => setField("status", s)}
                          className="text-indigo-600" />
                        <span className="text-sm text-slate-700">{s}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <button type="button" onClick={closeModal} className={BTN_SECONDARY}>Cancel</button>
              <button type="button"
                onClick={modal.mode === "create" ? handleCreate : handleUpdate}
                className={BTN_PRIMARY}>
                {modal.mode === "create" ? "Create User" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete User"
        message="This user will immediately lose all access. This cannot be undone."
        confirmLabel="Delete User"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
