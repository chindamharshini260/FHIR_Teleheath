import React, { useState } from 'react';
import { PatientProfile, SupportedCondition } from '../../types';
import { api } from '../../lib/api';
import { HeartPulse, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

interface MedicalConditionsViewProps {
  profile: PatientProfile;
  onConditionsUpdated: (updatedConditions: SupportedCondition[]) => void;
  onNavigateToMonitoring?: () => void;
}

const AVAILABLE_CONDITIONS: { name: SupportedCondition; description: string; hasAI: boolean }[] = [
  { name: 'Diabetes', description: 'Monitors Blood Glucose, HbA1c, and Weight', hasAI: true },
  { name: 'Hypertension', description: 'Monitors Blood Pressure and Heart Rate', hasAI: true },
  { name: 'COPD', description: 'Monitors Oxygen (SpO2), Breathing Rate, and Heart Rate', hasAI: true },
  { name: 'Asthma', description: 'Monitors Oxygen (SpO2) and Breathing Rate', hasAI: false },
  { name: 'Chronic Kidney Disease', description: 'Monitors Blood Pressure and Weight', hasAI: false },
  { name: 'Heart Disease', description: 'Monitors Blood Pressure, Heart Rate, and Weight', hasAI: false },
  { name: 'Obesity', description: 'Monitors Weight', hasAI: false },
];

export const MedicalConditionsView: React.FC<MedicalConditionsViewProps> = ({
  profile,
  onConditionsUpdated,
  onNavigateToMonitoring,
}) => {
  const [selectedConditions, setSelectedConditions] = useState<SupportedCondition[]>(
    profile.conditions || []
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const toggleCondition = (condition: SupportedCondition) => {
    setMessage(null);
    if (selectedConditions.includes(condition)) {
      setSelectedConditions(selectedConditions.filter((c) => c !== condition));
    } else {
      setSelectedConditions([...selectedConditions, condition]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await api.savePatientConditions(profile.userId, selectedConditions);
      onConditionsUpdated(res.conditions);
      setMessage({
        text: 'Your health conditions have been updated successfully.',
        type: 'success',
      });
    } catch (err: any) {
      setMessage({
        text: err.message || 'Failed to save health conditions.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">My Health Conditions</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tell us about the health conditions you have. This helps us show the right health measurements for you.
              </p>
            </div>
          </div>

          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 self-start sm:self-auto">
            Personalized Monitoring
          </span>
        </div>

        {/* Feedback message */}
        {message && (
          <div
            className={`mb-5 p-4 rounded-xl text-xs flex items-start justify-between gap-3 ${
              message.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">{message.text}</p>
                {message.type === 'success' && onNavigateToMonitoring && (
                  <button
                    type="button"
                    onClick={onNavigateToMonitoring}
                    className="mt-2.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold transition-colors shadow-xs"
                  >
                    <span>Enter Health Readings</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Condition Checkbox Cards */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Select Your Conditions
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AVAILABLE_CONDITIONS.map((cond) => {
              const isSelected = selectedConditions.includes(cond.name);
              return (
                <div
                  key={cond.name}
                  onClick={() => toggleCondition(cond.name)}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-teal-600 bg-teal-50/50 ring-1 ring-teal-600'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-bold text-slate-900">{cond.name}</span>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // Handled by card click
                      className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 mt-0.5 cursor-pointer"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5">{cond.description}</p>
                  {cond.hasAI && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-700 mt-2 bg-teal-100/60 px-2 py-0.5 rounded w-fit">
                      <Sparkles className="w-3 h-3" />
                      Risk Assessment Supported
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Summary & Save Button */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            {selectedConditions.length === 0 ? (
              <span>No condition selected yet.</span>
            ) : (
              <span>
                <strong>{selectedConditions.length}</strong> condition
                {selectedConditions.length === 1 ? '' : 's'} selected
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto inline-flex items-center justify-center py-2.5 px-6 rounded-lg text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 transition-colors disabled:opacity-50 shadow-xs"
            >
              {saving ? 'Saving...' : 'Save Conditions'}
            </button>
            {onNavigateToMonitoring && selectedConditions.length > 0 && (
              <button
                type="button"
                onClick={onNavigateToMonitoring}
                className="hidden sm:inline-flex items-center gap-1.5 py-2.5 px-4 rounded-lg text-sm font-semibold text-teal-700 hover:bg-teal-50 border border-teal-200 transition-colors"
              >
                <span>Health Monitoring</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Health measurements for each condition */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 text-xs text-slate-600 space-y-2">
        <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          Health measurements for each condition
        </h4>
        <p className="leading-relaxed">
          <strong>Routine Vital Tracking:</strong> You can record routine health measurements (such as Blood Pressure, Heart Rate, Blood Glucose, Oxygen Level, and Weight) for any of your selected conditions.
        </p>
        <p className="leading-relaxed">
          <strong>Health Risk Assessment:</strong> Automated risk evaluations are currently active for Diabetes, Hypertension, and COPD to assist in your health monitoring.
        </p>
      </div>
    </div>
  );
};
