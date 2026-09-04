import React, { useEffect, useState } from "react";
import { CloudCog, Save, Loader2, Info } from "lucide-react";

import { targetUrl } from "../config";
import { useToast } from "../components/ToastContext";

const PROVIDERS = ["onedrive", "s3"];

const defaultCloudSync = {
  filePath: "",
  username: "",
  password: "",
  provider: "onedrive",

  onedrive: {
    link: "",
  },

  s3: {
    bucketName: "",
    region: "",
    accessKeyId: "",
    secretAccessKey: "",
    path: "",
    accountId: "",
    endpointUrl: "",
    namingConvention: "",
  },
};

const inputCls =
  "w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-60";
const labelCls = "text-xs font-bold text-slate-500 uppercase";

export default function FileCloudSync({ isReadOnly = false }) {
  const [cfg, setCfg] = useState(defaultCloudSync);
  const [isSaving, setIsSaving] = useState(false);
  const showToast = useToast();

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch(`${targetUrl}/config`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();

        setCfg({
          ...defaultCloudSync,
          ...data.cloud_sync,
          onedrive: { ...defaultCloudSync.onedrive, ...(data.cloud_sync?.onedrive || {}) },
          s3: { ...defaultCloudSync.s3, ...(data.cloud_sync?.s3 || {}) },
        });
      } catch (err) {
        console.error("Cloud sync config load failed", err);
      }
    }

    loadConfig();
  }, []);

  const update = (path, value) => {
    setCfg((prev) => {
      const updated = { ...prev };
      const keys = path.split(".");
      let target = updated;
      for (let i = 0; i < keys.length - 1; i += 1) {
        target = target[keys[i]] = { ...target[keys[i]] };
      }
      target[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const save = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${targetUrl}/config`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cloud_sync: cfg }),
      });

      if (res.ok) {
        showToast("Cloud sync configuration saved successfully", "success");
      } else {
        showToast("Failed to save cloud sync configuration", "error");
      }
    } catch (err) {
      showToast("Network error while saving", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      <div className="flex-shrink-0 p-6 bg-white border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">File Cloud Sync</h1>
        <p className="text-slate-500 text-sm">
          Sync a file from a network location to OneDrive or AWS S3.
        </p>
      </div>

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">

          {/* Source file */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">Source File</h3>

            <div className="space-y-1">
              <label className={labelCls}>File Location on Network</label>
              <input
                value={cfg.filePath}
                disabled={isReadOnly}
                onChange={(e) => update("filePath", e.target.value)}
                className={inputCls}
                placeholder="\\server\share\folder\file.csv"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className={labelCls}>Username</label>
                <input
                  value={cfg.username}
                  disabled={isReadOnly}
                  onChange={(e) => update("username", e.target.value)}
                  className={inputCls}
                  placeholder="Username for the network system"
                />
              </div>

              <div className="space-y-1">
                <label className={labelCls}>Password</label>
                <input
                  type="password"
                  value={cfg.password}
                  disabled={isReadOnly}
                  onChange={(e) => update("password", e.target.value)}
                  className={inputCls}
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          {/* Destination */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">Destination</h3>

            <div className="flex rounded-xl border border-slate-200 overflow-hidden w-fit">
              {PROVIDERS.map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => update("provider", p)}
                  className={`px-4 py-2 text-xs font-semibold border-l border-slate-200 first:border-l-0 transition-colors disabled:cursor-not-allowed ${
                    cfg.provider === p ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {p === "onedrive" ? "OneDrive" : "AWS S3"}
                </button>
              ))}
            </div>

            {cfg.provider === "onedrive" && (
              <div className="space-y-1">
                <label className={labelCls}>OneDrive Link</label>
                <input
                  value={cfg.onedrive.link}
                  disabled={isReadOnly}
                  onChange={(e) => update("onedrive.link", e.target.value)}
                  className={inputCls}
                  placeholder="https://onedrive.live.com/..."
                />
              </div>
            )}

            {cfg.provider === "s3" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className={labelCls}>S3 Bucket Name</label>
                    <input
                      value={cfg.s3.bucketName}
                      disabled={isReadOnly}
                      onChange={(e) => update("s3.bucketName", e.target.value)}
                      className={inputCls}
                      placeholder="customer-data-bucket"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className={labelCls}>AWS Region</label>
                    <input
                      value={cfg.s3.region}
                      disabled={isReadOnly}
                      onChange={(e) => update("s3.region", e.target.value)}
                      className={inputCls}
                      placeholder="ap-south-1"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className={labelCls}>AWS Access Key ID</label>
                    <input
                      value={cfg.s3.accessKeyId}
                      disabled={isReadOnly}
                      onChange={(e) => update("s3.accessKeyId", e.target.value)}
                      className={inputCls}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className={labelCls}>AWS Secret Access Key</label>
                    <input
                      type="password"
                      value={cfg.s3.secretAccessKey}
                      disabled={isReadOnly}
                      onChange={(e) => update("s3.secretAccessKey", e.target.value)}
                      className={inputCls}
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className={labelCls}>S3 Folder / Path (Prefix)</label>
                    <input
                      value={cfg.s3.path}
                      disabled={isReadOnly}
                      onChange={(e) => update("s3.path", e.target.value)}
                      className={inputCls}
                      placeholder="gateway-001/csv/"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className={labelCls}>AWS Account ID (optional)</label>
                    <input
                      value={cfg.s3.accountId}
                      disabled={isReadOnly}
                      onChange={(e) => update("s3.accountId", e.target.value)}
                      className={inputCls}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className={labelCls}>Bucket / Endpoint URL (optional)</label>
                    <input
                      value={cfg.s3.endpointUrl}
                      disabled={isReadOnly}
                      onChange={(e) => update("s3.endpointUrl", e.target.value)}
                      className={inputCls}
                      placeholder="For a custom S3-compatible endpoint"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className={labelCls}>File Naming Convention (optional)</label>
                    <input
                      value={cfg.s3.namingConvention}
                      disabled={isReadOnly}
                      onChange={(e) => update("s3.namingConvention", e.target.value)}
                      className={inputCls}
                      placeholder="e.g. {gateway_id}_{yyyyMMdd_HHmmss}.csv"
                    />
                  </div>
                </div>

                <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <Info size={14} className="mt-0.5 flex-shrink-0" />
                  <span>
                    The IAM credentials above must grant, at minimum, <code>s3:PutObject</code> on this bucket/path.
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button
              className="flex items-center justify-center gap-2 px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-all w-full md:w-auto disabled:opacity-70"
              onClick={save}
              disabled={isSaving || isReadOnly}
            >
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {isSaving ? "Saving..." : "Save Configuration"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
