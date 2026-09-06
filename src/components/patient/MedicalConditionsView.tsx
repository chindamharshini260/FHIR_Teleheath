import React, { useState } from 'react';
import { PatientProfile, SupportedCondition } from '../../types';
import { api } from '../../lib/api';
import { buildFHIRCondition } from '../../lib/fhir';
import { Activity, CheckCircle2, AlertCircle, X, HeartPulse, FileCode, ArrowRight } from 'lucide-react';
import { FHIRInspectorModal } from '../common/FHIRInspectorModal';

interface MedicalConditionsViewProps {
  profile: PatientProfile;
  onConditionsUpdated: (updatedConditions: SupportedCondition[]) => void;
  onNavigateToMonitoring?: () => void;
}

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
  const [inspectorData, setInspectorData] = useState<{
    title: string;
    resourceName: string;
    json: object;
  } | null>(null);

  const availableConditions: SupportedCondition[] = ['Diabetes', 'Hypertension', 'COPD'];

  const handleSelectCondition = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as SupportedCondition;
    if (value && !selectedConditions.includes(value)) {
      setSelectedConditions([...selectedConditions, value]);
      setMessage(null);
    }
    // reset select dropdown
    e.target.value = '';
  };

  const handleRemoveCondition = (conditionToRemove: SupportedCondition) => {
    setSelectedConditions(selectedConditions.filter((c) => c !== conditionToRemove));
    setMessage(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await api.savePatientConditions(profile.userId, selectedConditions);
      onConditionsUpdated(res.conditions);
      setMessage({
        text: `Medical condition(s) saved successfully: ${
          selectedConditions.join(', ') || 'None selected'
        }. Health monitoring parameters are now configured.`,
        type: 'success',
      });
    } catch (err: any) {
      setMessage({
        text: err.message || 'Failed to save medical conditions.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Title & Info */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Medical Conditions</h2>
            <p className="text-sm font-semibold text-slate-700 mt-0.5">
              What medical condition do you have?
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Tell the system your diagnosed condition(s). The system stores your selection and
          automatically determines the relevant health parameters for your monitoring forms.
        </p>

        {/* Feedback messages */}
        {message && (
          <div
            className={`mt-4 p-3.5 rounded-lg text-xs flex items-start justify-between gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-start gap-2">
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              )}
              <div>
                <p className="font-semibold">{message.text}</p>
                {message.type === 'success' && onNavigateToMonitoring && (
                  <button
                    type="button"
                    onClick={onNavigateToMonitoring}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold transition-colors"
                  >
                    <span>Proceed to Health Monitoring</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {selectedConditions.length > 0 && message.type === 'success' && (
              <button
                type="button"
                onClick={() =>
                  setInspectorData({
                    title: `FHIR Condition: ${selectedConditions[0]}`,
                    resourceName: 'Condition',
                    json: buildFHIRCondition(profile.userId, selectedConditions[0]),
                  })
                }
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 underline hover:text-teal-900 shrink-0"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>View FHIR Condition</span>
              </button>
            )}
          </div>
        )}

        <div className="mt-6 space-y-5">
          {/* Dropdown to select condition */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Medical Condition(s)
            </label>
            <div className="relative max-w-md">
              <select
                onChange={handleSelectCondition}
                defaultValue=""
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none bg-white font-medium text-slate-800"
              >
                <option value="" disabled>
                  Select condition ▼
                </option>
                {availableConditions.map((cond) => {
                  const isSelected = selectedConditions.includes(cond);
                  return (
                    <option key={cond} value={cond} disabled={isSelected}>
                      {cond} {isSelected ? '(Already added)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              You can select one or multiple conditions (Diabetes, Hypertension, COPD).
            </p>
          </div>

          {/* Selected Conditions list */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Selected Conditions:
            </label>
            {selectedConditions.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                No conditions selected yet. Choose a condition from the dropdown above.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                {selectedConditions.map((cond) => (
                  <span
                    key={cond}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-teal-50 text-teal-900 border border-teal-200"
                  >
                    <HeartPulse className="w-3.5 h-3.5 text-teal-600" />
                    <span>{cond}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCondition(cond)}
                      className="p-0.5 rounded-full hover:bg-teal-200 text-teal-700 transition-colors ml-1"
                      title={`Remove ${cond}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Save Action */}
          <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center justify-center py-2.5 px-6 rounded-lg text-sm font-semibold text-white bg-slate-900 hover:bg-teal-700 transition-colors disabled:opacity-50 shadow-xs"
            >
              {saving ? 'Saving Conditions...' : 'Save Conditions'}
            </button>

            {onNavigateToMonitoring && selectedConditions.length > 0 && (
              <button
                type="button"
                onClick={onNavigateToMonitoring}
                className="py-2.5 px-4 rounded-lg text-sm font-semibold text-teal-700 hover:bg-teal-50 border border-teal-200 transition-colors inline-flex items-center gap-1.5"
              >
                <span>Go to Health Monitoring</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Clinical Parameter Mapping Reference */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
          System Parameter Mapping Reference
        </h4>
        <p className="text-xs text-slate-500 mb-3">
          Upon saving your condition, the Health Monitoring page automatically configures only the
          following relevant clinical data fields:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <h5 className="font-bold text-teal-900 mb-1 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-teal-600" />
              DIABETES
            </h5>
            <ul className="space-y-0.5 text-slate-600">
              <li>&rarr; Blood Glucose</li>
              <li>&rarr; HbA1c</li>
              <li>&rarr; Weight</li>
            </ul>
          </div>
          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <h5 className="font-bold text-teal-900 mb-1 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-rose-600" />
              HYPERTENSION
            </h5>
            <ul className="space-y-0.5 text-slate-600">
              <li>&rarr; Blood Pressure (Systolic &amp; Diastolic)</li>
              <li>&rarr; Heart Rate</li>
            </ul>
          </div>
          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <h5 className="font-bold text-teal-900 mb-1 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-teal-600" />
              COPD
            </h5>
            <ul className="space-y-0.5 text-slate-600">
              <li>&rarr; SpO2</li>
              <li>&rarr; Respiratory Rate</li>
              <li>&rarr; Heart Rate</li>
            </ul>
          </div>
        </div>
      </div>

      {/* FHIR Inspector Modal */}
      {inspectorData && (
        <FHIRInspectorModal
          title={inspectorData.title}
          resourceName={inspectorData.resourceName}
          fhirJson={inspectorData.json}
          onClose={() => setInspectorData(null)}
        />
      )}
    </div>
  );
};
