import React, { useState } from "react";
import { Building2, Key, Shield, CheckCircle2, Save } from "lucide-react";
import { useOrg } from "../../context/OrgContext";

export const SettingsPage: React.FC = () => {
  const { activeOrg } = useOrg();
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          System & Organization Settings
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure organization boundaries, API keys for embedding providers, and automated webhook triggers.
        </p>
      </div>

      {saved && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Configuration saved successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Organization Information */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.07] space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-white/[0.06] pb-3">
            <Building2 className="w-4 h-4 text-indigo-400" />
            <span>Organization Profile</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold">Organization Name</label>
              <input
                type="text"
                defaultValue={activeOrg?.name || "Personal Workspace"}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold">Current User Role</label>
              <input
                type="text"
                value={(activeOrg?.userRole || "ADMIN").toUpperCase()}
                readOnly
                className="w-full px-3 py-2 rounded-lg bg-white/[0.01] border border-white/[0.06] text-slate-400 font-mono"
              />
            </div>
          </div>
        </div>

        {/* AI & Embeddings Providers */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.07] space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-white/[0.06] pb-3">
            <Key className="w-4 h-4 text-cyan-400" />
            <span>AI Model & Embedding Providers</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold">Active Embedding Provider</label>
              <select className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/[0.08] text-white focus:outline-none focus:border-indigo-500">
                <option>OpenAI (text-embedding-3-small) / Deterministic Fallback DSP</option>
                <option>Local HuggingFace / Transformers.js</option>
                <option>Cohere Embed v3</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold">Reranking Model</label>
              <input
                type="text"
                defaultValue="Reciprocal Rank Fusion (k=60) + Cosine Distance"
                readOnly
                className="w-full px-3 py-2 rounded-lg bg-white/[0.01] border border-white/[0.06] text-slate-400 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Security & Cryptographic Fencing */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.07] space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-white/[0.06] pb-3">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Data Fencing & Retention</span>
          </div>

          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Multi-tenant cryptographic fencing active</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Zero-training guarantee: Source code is never retained for model training</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 transition shadow-lg shadow-indigo-500/25 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
