import React, { useState } from 'react';
import {
  SupportedCondition,
  HealthReading,
  MeasurementContext,
} from '../../types';
import { api } from '../../lib/api';
import { buildFHIRObservation } from '../../lib/fhir';
import {
  Activity,
  HeartPulse,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  FileCode,
  Heart,
  Pill,
} from 'lucide-react';
import { FHIRInspectorModal } from '../common/FHIRInspectorModal';

interface ConditionMonitoringFormProps {
  patientId: string;
  conditions: SupportedCondition[];
  readings?: HealthReading[];
  onReadingAdded: (reading: HealthReading) => void;
  onNavigateToConditions: () => void;
}

export const ConditionMonitoringForm: React.FC<ConditionMonitoringFormProps> = ({
  patientId,
  conditions,
  readings = [],
  onReadingAdded,
  onNavigateToConditions,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const currentTime = new Date().toTimeString().substring(0, 5);

  const [date, setDate] = useState(today);
  const [time, setTime] = useState(currentTime);
  const [notes, setNotes] = useState('');

  // Values for condition-specific fields
  // Diabetes
  const [bloodGlucose, setBloodGlucose] = useState('');
  const [glucoseContext, setGlucoseContext] = useState<MeasurementContext>('Fasting');
  const [hba1c, setHba1c] = useState('');
  const [weight, setWeight] = useState('');

  // Hypertension
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');

  // Shared / COPD
  const [heartRate, setHeartRate] = useState('');
  const [spo2, setSpo2] = useState('');
  const [respiratoryRate, setRespiratoryRate] = useState('');

  // Status
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [inspectorData, setInspectorData] = useState<{
    title: string;
    resourceName: string;
    json: object;
  } | null>(null);

  // Condition check
  const safeConditions = conditions || [];
  const hasDiabetes = safeConditions.includes('Diabetes');
  const hasHypertension = safeConditions.includes('Hypertension');
  const hasCOPD = safeConditions.includes('COPD');

  // If patient has not selected any condition
  if (safeConditions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 mx-auto flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-2">
          Please select your medical condition(s) before entering health readings.
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
          The system will automatically determine and display the relevant health parameters based
          on your diagnosed condition (Diabetes, Hypertension, or COPD).
        </p>
        <button
          type="button"
          onClick={onNavigateToConditions}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold transition-colors shadow-xs"
        >
          <HeartPulse className="w-4 h-4" />
          <span>Select Medical Condition(s)</span>
        </button>
      </div>
    );
  }

  const handleSaveReadings = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const readingsToSave: Omit<HealthReading, 'id' | 'createdAt' | 'patientId'>[] = [];

    // Diabetes fields
    if (hasDiabetes) {
      if (bloodGlucose.trim()) {
        const bgNum = Number(bloodGlucose);
        if (isNaN(bgNum) || bgNum < 20 || bgNum > 800) {
          setErrorMessage('Blood Glucose must be a valid number between 20 and 800 mg/dL.');
          return;
        }
        readingsToSave.push({
          parameterType: 'blood_glucose',
          value: bgNum,
          unit: 'mg/dL',
          measurementContext: glucoseContext,
          date,
          time,
          notes: notes.trim() || undefined,
          source: 'Patient',
        });
      }

      if (hba1c.trim()) {
        const hba1cNum = Number(hba1c);
        if (isNaN(hba1cNum) || hba1cNum < 3 || hba1cNum > 20) {
          setErrorMessage('HbA1c must be a valid percentage between 3% and 20%.');
          return;
        }
        readingsToSave.push({
          parameterType: 'hba1c',
          value: hba1cNum,
          unit: '%',
          date,
          time,
          notes: notes.trim() || undefined,
          source: 'Patient',
        });
      }

      if (weight.trim()) {
        const wtNum = Number(weight);
        if (isNaN(wtNum) || wtNum < 20 || wtNum > 350) {
          setErrorMessage('Weight must be a valid number between 20 and 350 kg.');
          return;
        }
        readingsToSave.push({
          parameterType: 'weight',
          value: wtNum,
          unit: 'kg',
          date,
          time,
          notes: notes.trim() || undefined,
          source: 'Patient',
        });
      }
    }

    // Hypertension fields
    if (hasHypertension) {
      if (systolic.trim() || diastolic.trim()) {
        const sysNum = Number(systolic);
        const diaNum = Number(diastolic);
        if (
          isNaN(sysNum) ||
          isNaN(diaNum) ||
          sysNum <= 40 ||
          diaNum <= 30 ||
          sysNum >= 300 ||
          diaNum >= 200
        ) {
          setErrorMessage(
            'Please enter both valid Systolic (50-280 mmHg) and Diastolic (35-180 mmHg) values for Blood Pressure.'
          );
          return;
        }
        readingsToSave.push({
          parameterType: 'blood_pressure',
          systolic: sysNum,
          diastolic: diaNum,
          unit: 'mmHg',
          date,
          time,
          notes: notes.trim() || undefined,
          source: 'Patient',
        });
      }
    }

    // Shared Heart Rate (Relevant if Hypertension OR COPD)
    if (hasHypertension || hasCOPD) {
      if (heartRate.trim()) {
        const hrNum = Number(heartRate);
        if (isNaN(hrNum) || hrNum < 30 || hrNum > 250) {
          setErrorMessage('Heart Rate must be a valid number between 30 and 250 bpm.');
          return;
        }
        readingsToSave.push({
          parameterType: 'heart_rate',
          value: hrNum,
          unit: 'bpm',
          date,
          time,
          notes: notes.trim() || undefined,
          source: 'Patient',
        });
      }
    }

    // COPD fields
    if (hasCOPD) {
      if (spo2.trim()) {
        const spo2Num = Number(spo2);
        if (isNaN(spo2Num) || spo2Num < 50 || spo2Num > 100) {
          setErrorMessage('SpO2 must be a valid percentage between 50% and 100%.');
          return;
        }
        readingsToSave.push({
          parameterType: 'spo2',
          value: spo2Num,
          unit: '%',
          date,
          time,
          notes: notes.trim() || undefined,
          source: 'Patient',
        });
      }

      if (respiratoryRate.trim()) {
        const rrNum = Number(respiratoryRate);
        if (isNaN(rrNum) || rrNum < 6 || rrNum > 60) {
          setErrorMessage('Respiratory Rate must be a valid number between 6 and 60 breaths/min.');
          return;
        }
        readingsToSave.push({
          parameterType: 'respiratory_rate',
          value: rrNum,
          unit: 'breaths/min',
          date,
          time,
          notes: notes.trim() || undefined,
          source: 'Patient',
        });
      }
    }

    if (readingsToSave.length === 0) {
      setErrorMessage('Please enter at least one health reading before saving.');
      return;
    }

    setSaving(true);
    try {
      const created = await api.saveReadingsBatch(patientId, readingsToSave);
      created.forEach((r) => onReadingAdded(r));

      // Reset values
      setBloodGlucose('');
      setHba1c('');
      setWeight('');
      setSystolic('');
      setDiastolic('');
      setHeartRate('');
      setSpo2('');
      setRespiratoryRate('');
      setNotes('');

      const paramNames = created
        .map((r) => r.parameterType.replace('_', ' ').toUpperCase())
        .join(', ');
      setSuccessMessage(`Saved ${created.length} FHIR Observation(s): ${paramNames}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to save health reading.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        {/* Header with saved conditions */}
        <div className="pb-5 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-slate-500 block">
                {conditions.length === 1 ? 'Your Condition:' : 'Your Conditions:'}
              </span>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {conditions.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-900 border border-teal-200"
                  >
                    <HeartPulse className="w-3.5 h-3.5 text-teal-600" />
                    <span>{c}</span>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={onNavigateToConditions}
                  className="text-xs font-semibold text-teal-700 hover:underline ml-1"
                >
                  Edit Conditions
                </button>
              </div>
            </div>

            <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 self-start sm:self-center">
              HL7 FHIR R4 Observation
            </span>
          </div>

          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mt-5">
            Relevant Health Data:
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            The system automatically identified relevant parameters for your diagnosed condition(s).
            Enter your actual reading(s) below.
          </p>
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="mt-4 p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-medium">{successMessage}</span>
            </div>
            {readings.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  setInspectorData({
                    title: `FHIR Observation: ${readings[0].parameterType}`,
                    resourceName: 'Observation',
                    json: buildFHIRObservation(readings[0]),
                  })
                }
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 underline hover:text-teal-900"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>View FHIR JSON</span>
              </button>
            )}
          </div>
        )}

        {/* Unified Relevant Entry Form */}
        <form onSubmit={handleSaveReadings} className="mt-6 space-y-6">
          {/* DIABETES RELEVANT PARAMETERS */}
          {hasDiabetes && (
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="text-xs font-bold text-teal-900 uppercase tracking-wide flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-teal-600" />
                  Diabetes Parameters
                </span>
                <span className="text-[10px] font-mono text-slate-400">LOINC: 2339-0, 4548-4, 29463-7</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Blood Glucose */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Blood Glucose
                  </label>
                  <div className="space-y-1.5">
                    <input
                      type="number"
                      step="any"
                      value={bloodGlucose}
                      onChange={(e) => setBloodGlucose(e.target.value)}
                      placeholder="Enter value (mg/dL)"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
                    />
                    <select
                      value={glucoseContext}
                      onChange={(e: any) => setGlucoseContext(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 focus:outline-none"
                    >
                      <option value="Fasting">Fasting</option>
                      <option value="Post-meal">Post-meal</option>
                      <option value="Random">Random</option>
                    </select>
                  </div>
                </div>

                {/* HbA1c */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    HbA1c
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={hba1c}
                    onChange={(e) => setHba1c(e.target.value)}
                    placeholder="Enter value (%)"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Ref: &lt; 5.7% Normal</span>
                </div>

                {/* Weight */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Weight
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="Enter value (kg)"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Body mass index monitoring</span>
                </div>
              </div>
            </div>
          )}

          {/* HYPERTENSION RELEVANT PARAMETERS */}
          {hasHypertension && (
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="text-xs font-bold text-teal-900 uppercase tracking-wide flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-600" />
                  Hypertension Parameters
                </span>
                <span className="text-[10px] font-mono text-slate-400">LOINC: 85354-9 (Sys/Dia)</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Blood Pressure
                </label>
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  <div>
                    <label className="block text-[11px] text-slate-500 font-medium mb-0.5">
                      Systolic
                    </label>
                    <input
                      type="number"
                      value={systolic}
                      onChange={(e) => setSystolic(e.target.value)}
                      placeholder="Enter value (mmHg)"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 font-medium mb-0.5">
                      Diastolic
                    </label>
                    <input
                      type="number"
                      value={diastolic}
                      onChange={(e) => setDiastolic(e.target.value)}
                      placeholder="Enter value (mmHg)"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SHARED HEART RATE (Only rendered if Hypertension OR COPD, deduplicated) */}
          {(hasHypertension || hasCOPD) && (
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="text-xs font-bold text-teal-900 uppercase tracking-wide flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-teal-600" />
                  Heart Rate
                </span>
                <span className="text-[10px] font-mono text-slate-400">LOINC: 8867-4</span>
              </div>

              <div className="max-w-xs">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Heart Rate
                </label>
                <input
                  type="number"
                  value={heartRate}
                  onChange={(e) => setHeartRate(e.target.value)}
                  placeholder="Enter value (bpm)"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Resting pulse rate (30 - 250 bpm)</span>
              </div>
            </div>
          )}

          {/* COPD RELEVANT PARAMETERS */}
          {hasCOPD && (
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="text-xs font-bold text-teal-900 uppercase tracking-wide flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-teal-600" />
                  COPD Respiratory Parameters
                </span>
                <span className="text-[10px] font-mono text-slate-400">LOINC: 59408-5, 9279-1</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* SpO2 */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    SpO2
                  </label>
                  <input
                    type="number"
                    value={spo2}
                    onChange={(e) => setSpo2(e.target.value)}
                    placeholder="Enter value (%)"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Pulse oximeter reading</span>
                </div>

                {/* Respiratory Rate */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Respiratory Rate
                  </label>
                  <input
                    type="number"
                    value={respiratoryRate}
                    onChange={(e) => setRespiratoryRate(e.target.value)}
                    placeholder="Enter value (breaths/min)"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Normal range: 12 - 20 bpm</span>
                </div>
              </div>
            </div>
          )}

          {/* Timestamp & Clinical Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Observation Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> Observation Time
              </label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Patient Context Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Measured 2 hours after breakfast; feeling well."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
            />
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center py-2.5 px-6 rounded-lg text-sm font-semibold text-white bg-slate-900 hover:bg-teal-700 transition-colors disabled:opacity-50 shadow-xs"
            >
              {saving ? 'Saving Observations...' : 'Save Reading'}
            </button>

            <span className="text-[11px] text-slate-400 italic">
              Authentic FHIR Observation resources will be generated for entered data.
            </span>
          </div>
        </form>
      </div>

      {/* RECENT READINGS LIST & EMPTY STATE */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Recent Health Readings
          </h4>
          <span className="text-xs font-semibold text-slate-500">
            {readings.length} Recorded
          </span>
        </div>

        {readings.length === 0 ? (
          <div className="py-10 text-center bg-slate-50 rounded-lg border border-slate-100">
            <Activity className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">
              No readings recorded yet.
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Enter your actual health measurements above and click "Save Reading".
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {readings.slice(0, 10).map((r) => (
              <div key={r.id} className="py-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    {r.parameterType.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="text-xs text-slate-600 font-medium">
                    {r.parameterType === 'blood_pressure'
                      ? `${r.systolic}/${r.diastolic} mmHg`
                      : `${r.value} ${r.unit}${
                          r.measurementContext ? ` (${r.measurementContext})` : ''
                        }`}
                  </span>
                  {r.notes && (
                    <span className="text-[11px] text-slate-400 block mt-0.5 italic">
                      "{r.notes}"
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-400">
                    {r.date} {r.time || ''}
                  </span>
                  <button
                    onClick={() =>
                      setInspectorData({
                        title: `FHIR Observation: ${r.parameterType}`,
                        resourceName: 'Observation',
                        json: buildFHIRObservation(r),
                      })
                    }
                    className="p-1.5 rounded text-slate-400 hover:text-teal-700 hover:bg-teal-50 transition-colors"
                    title="Inspect FHIR Observation JSON"
                  >
                    <FileCode className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
