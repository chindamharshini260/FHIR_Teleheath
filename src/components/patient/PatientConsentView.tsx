import React, { useState } from 'react';
import { PatientConsent } from '../../types';
import { api } from '../../lib/api';
import { ShieldCheck, CheckCircle2, AlertCircle, Check } from 'lucide-react';

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
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleUpdate = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await api.updateConsent(patientId, {
        status,
        scope: consent?.scope || 'all_health_records',
        grantedAt: new Date().toISOString(),
      });
      onConsentUpdated(updated);
      setMessage('Your privacy and consent preferences have been saved.');
    } catch (err: any) {
      setMessage('Failed to update consent preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const consentOptions = [
    {
      id: 'active',
      label: 'Active',
      description:
        'Your doctors and care team can securely access your health readings, medical history, and appointments to provide care.',
      badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    {
      id: 'inactive',
      label: 'Temporarily Inactive',
      description:
        'Sharing is paused temporarily. Your records remain stored safely, but your care team is not actively monitoring new updates.',
      badgeColor: 'text-amber-700 bg-amber-50 border-amber-200',
    },
    {
      id: 'rejected',
      label: 'Revoked',
      description:
        'Health data sharing is stopped. Your doctors will not receive new updates or remote readings from your account.',
      badgeColor: 'text-rose-700 bg-rose-50 border-rose-200',
    },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="pb-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Privacy &amp; Consent</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Choose how your health information can be used and shared.
          </p>
        </div>

        {message && (
          <div className="mt-4 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        <div className="pt-5 space-y-3">
          {consentOptions.map((opt) => {
            const isSelected = status === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => setStatus(opt.id as any)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-teal-600 bg-teal-50/40 ring-1 ring-teal-600'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-bold text-slate-900">{opt.label}</span>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      isSelected
                        ? 'border-teal-600 bg-teal-600 text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{opt.description}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={handleUpdate}
            disabled={saving}
            className="w-full sm:w-auto inline-flex items-center justify-center py-2.5 px-6 rounded-lg text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 transition-colors disabled:opacity-50 shadow-xs"
          >
            {saving ? 'Saving...' : 'Save Consent Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};
