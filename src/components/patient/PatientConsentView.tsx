import React, { useState } from 'react';
import { PatientConsent } from '../../types';
import { api } from '../../lib/api';
import { ShieldCheck, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface PatientConsentViewProps {
  patientId: string;
  consent: PatientConsent | null;
  onConsentUpdated: (updated: PatientConsent) => void;
}

export const PatientConsentView: React.FC<PatientConsentViewProps> = ({
  patientId,
  consent,
  onConsentUpdated,
}) => {
  const [status, setStatus] = useState<'active' | 'inactive' | 'rejected'>(
    consent?.status || 'active'
  );
  const [scope, setScope] = useState(consent?.scope || 'all_health_records');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleUpdate = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await api.updateConsent(patientId, {
        status,
        scope,
        grantedAt: new Date().toISOString(),
      });
      onConsentUpdated(updated);
      setMessage('Consent preferences updated in accordance with FHIR Consent resource specifications.');
    } catch (err: any) {
      setMessage('Failed to update consent preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Patient Privacy &amp; Data Consent</h3>
            <p className="text-xs text-slate-500">
              Governs clinical data sharing, remote monitoring ingestion, and FHIR interoperability
            </p>
          </div>
        </div>
        <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
          FHIR Consent (R4)
        </span>
      </div>

      {message && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <div className="space-y-4 max-w-2xl">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">Consent Status</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'active', label: 'Active / Granted', color: 'border-teal-600 bg-teal-50 text-teal-900' },
              { id: 'inactive', label: 'Temporarily Inactive', color: 'border-amber-500 bg-amber-50 text-amber-900' },
              { id: 'rejected', label: 'Revoked / Opt-Out', color: 'border-red-500 bg-red-50 text-red-900' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setStatus(opt.id as any)}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all ${
                  status === opt.id ? opt.color : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Permitted Scope</label>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
          >
            <option value="all_health_records">All Health Records (Vitals, Conditions, Labs, Encounters)</option>
            <option value="vitals_only">Vital Signs Monitoring Only</option>
            <option value="telehealth_only">Direct Telehealth Encounters Only</option>
          </select>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
          <p>
            <strong>Organization:</strong> Metropolitan Telehealth &amp; Research Hospital (org-metro-health)
          </p>
          <p>
            <strong>Purpose of Use:</strong> Telehealth Clinical Care &amp; Chronic Disease Remote Surveillance
          </p>
          <p>
            <strong>Granted At:</strong> {consent?.grantedAt ? new Date(consent.grantedAt).toLocaleString() : 'Active session'}
          </p>
        </div>

        <button
          onClick={handleUpdate}
          disabled={saving}
          className="inline-flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
          <span>Save Consent Record</span>
        </button>
      </div>
    </div>
  );
};
