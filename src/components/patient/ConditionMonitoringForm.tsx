import React, { useState } from 'react';
import {
  SupportedCondition,
  HealthReading,
  MeasurementContext,
} from '../../types';
import { api } from '../../lib/api';
import {
  HeartPulse,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  Activity,
  Edit2,
} from 'lucide-react';

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
  onReadingAdded,
  onNavigateToConditions,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const currentTime = new Date().toTimeString().substring(0, 5);

  const [date, setDate] = useState(today);
  const [time, setTime] = useState(currentTime);
  const [notes, setNotes] = useState('');

  // Vital inputs
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [bloodGlucose, setBloodGlucose] = useState('');
  const [glucoseContext, setGlucoseContext] = useState<MeasurementContext>('Fasting');
  const [hba1c, setHba1c] = useState('');
  const [weight, setWeight] = useState('');
  const [spo2, setSpo2] = useState('');
  const [respiratoryRate, setRespiratoryRate] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const safeConditions = conditions || [];

  // Determine what parameters are relevant based on selected conditions
  const showBloodPressure = safeConditions.some((c) =>
    ['Hypertension', 'Chronic Kidney Disease', 'Heart Disease'].includes(c)
  );
  const showHeartRate = safeConditions.some((c) =>
    ['Hypertension', 'COPD', 'Asthma', 'Heart Disease'].includes(c)
  );
  const showBloodGlucose = safeConditions.includes('Diabetes');
  const showHbA1c = safeConditions.includes('Diabetes');
  const showWeight = safeConditions.some((c) =>
    ['Diabetes', 'Chronic Kidney Disease', 'Heart Disease', 'Obesity'].includes(c)
  );
  const showOxygen = safeConditions.some((c) => ['COPD', 'Asthma'].includes(c));
  const showRespiratoryRate = safeConditions.some((c) => ['COPD', 'Asthma'].includes(c));

  // If patient has no condition selected
  if (safeConditions.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-xs max-w-2xl mx-auto">
        <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-700 mx-auto flex items-center justify-center mb-3">
          <HeartPulse className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">
          No medical condition selected yet
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
          Please select your medical condition so we can show the relevant health readings for you.
        </p>
        <button
          type="button"
          onClick={onNavigateToConditions}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold transition-colors shadow-xs"
        >
          <HeartPulse className="w-4 h-4" />
          <span>Select Health Conditions</span>
        </button>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const readingsToSave: Omit<HealthReading, 'id' | 'createdAt' | 'patientId'>[] = [];

    // Blood Pressure
    if (showBloodPressure && (systolic.trim() || diastolic.trim())) {
      const sys = Number(systolic);
      const dia = Number(diastolic);
      if (isNaN(sys) || isNaN(dia) || sys < 50 || sys > 280 || dia < 30 || dia > 180) {
        setErrorMessage('Please enter valid Blood Pressure values (Systolic: 50–280, Diastolic: 30–180 mmHg).');
        return;
      }
      readingsToSave.push({
        parameterType: 'blood_pressure',
        systolic: sys,
        diastolic: dia,
        unit: 'mmHg',
        date,
        time,
        notes: notes.trim() || undefined,
        source: 'Patient',
      });
    }

    // Heart Rate
    if (showHeartRate && heartRate.trim()) {
      const hr = Number(heartRate);
      if (isNaN(hr) || hr < 30 || hr > 250) {
        setErrorMessage('Please enter a valid Heart Rate between 30 and 250 bpm.');
        return;
      }
      readingsToSave.push({
        parameterType: 'heart_rate',
        value: hr,
        unit: 'bpm',
        date,
        time,
        notes: notes.trim() || undefined,
        source: 'Patient',
      });
    }

    // Blood Glucose
    if (showBloodGlucose && bloodGlucose.trim()) {
      const bg = Number(bloodGlucose);
      if (isNaN(bg) || bg < 20 || bg > 800) {
        setErrorMessage('Please enter a valid Blood Glucose value between 20 and 800 mg/dL.');
        return;
      }
      readingsToSave.push({
        parameterType: 'blood_glucose',
        value: bg,
        unit: 'mg/dL',
        measurementContext: glucoseContext,
        date,
        time,
        notes: notes.trim() || undefined,
        source: 'Patient',
      });
    }

    // HbA1c
    if (showHbA1c && hba1c.trim()) {
      const hb = Number(hba1c);
      if (isNaN(hb) || hb < 3 || hb > 20) {
        setErrorMessage('Please enter a valid HbA1c percentage between 3% and 20%.');
        return;
      }
      readingsToSave.push({
        parameterType: 'hba1c',
        value: hb,
        unit: '%',
        date,
        time,
        notes: notes.trim() || undefined,
        source: 'Patient',
      });
    }

    // Weight
    if (showWeight && weight.trim()) {
      const wt = Number(weight);
      if (isNaN(wt) || wt < 20 || wt > 350) {
        setErrorMessage('Please enter a valid Weight between 20 and 350 kg.');
        return;
      }
      readingsToSave.push({
        parameterType: 'weight',
        value: wt,
        unit: 'kg',
        date,
        time,
        notes: notes.trim() || undefined,
        source: 'Patient',
      });
    }

    // Oxygen Saturation
    if (showOxygen && spo2.trim()) {
      const ox = Number(spo2);
      if (isNaN(ox) || ox < 50 || ox > 100) {
        setErrorMessage('Please enter a valid Oxygen Saturation between 50% and 100%.');
        return;
      }
      readingsToSave.push({
        parameterType: 'spo2',
        value: ox,
        unit: '%',
        date,
        time,
        notes: notes.trim() || undefined,
        source: 'Patient',
      });
    }

    // Respiratory Rate
    if (showRespiratoryRate && respiratoryRate.trim()) {
      const rr = Number(respiratoryRate);
      if (isNaN(rr) || rr < 6 || rr > 60) {
        setErrorMessage('Please enter a valid Respiratory Rate between 6 and 60 breaths/min.');
        return;
      }
      readingsToSave.push({
        parameterType: 'respiratory_rate',
        value: rr,
        unit: 'breaths/min',
        date,
        time,
        notes: notes.trim() || undefined,
        source: 'Patient',
      });
    }

    if (readingsToSave.length === 0) {
      setErrorMessage('Please enter at least one health measurement before saving.');
      return;
    }

    setSaving(true);
    try {
      const created = await api.saveReadingsBatch(patientId, readingsToSave);
      created.forEach((r) => onReadingAdded(r));

      // Reset entered numbers
      setSystolic('');
      setDiastolic('');
      setHeartRate('');
      setBloodGlucose('');
      setHba1c('');
      setWeight('');
      setSpo2('');
      setRespiratoryRate('');
      setNotes('');

      setSuccessMessage('Your health reading has been saved successfully.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to save reading. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        {/* Heading & Subtitle */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Health Monitoring</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your latest health readings.
            </p>
          </div>
        </div>

        {/* Condition Banner */}
        <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-3.5 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-teal-700 shrink-0" />
            <span className="text-xs text-teal-900">
              <strong className="font-semibold">Your Condition:</strong>{' '}
              {safeConditions.join(', ')}
            </span>
          </div>
          <button
            type="button"
            onClick={onNavigateToConditions}
            className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900 transition-colors"
          >
            <Edit2 className="w-3 h-3" />
            <span>Change</span>
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Dynamic Relevant Fields */}
        <div className="space-y-4">
          {/* Blood Pressure */}
          {showBloodPressure && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <label className="block text-xs font-bold text-slate-900 mb-2">
                Blood Pressure (mmHg)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Systolic (Upper)</label>
                  <input
                    type="number"
                    value={systolic}
                    onChange={(e) => setSystolic(e.target.value)}
                    placeholder="e.g. 120"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Diastolic (Lower)</label>
                  <input
                    type="number"
                    value={diastolic}
                    onChange={(e) => setDiastolic(e.target.value)}
                    placeholder="e.g. 80"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Heart Rate */}
          {showHeartRate && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Heart Rate (bpm)
              </label>
              <input
                type="number"
                value={heartRate}
                onChange={(e) => setHeartRate(e.target.value)}
                placeholder="e.g. 72"
                className="w-full max-w-xs px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none bg-white"
              />
            </div>
          )}

          {/* Blood Glucose */}
          {showBloodGlucose && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <label className="block text-xs font-bold text-slate-900 mb-2">
                Blood Glucose
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Glucose Level (mg/dL)</label>
                  <input
                    type="number"
                    value={bloodGlucose}
                    onChange={(e) => setBloodGlucose(e.target.value)}
                    placeholder="e.g. 110"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Measurement Type</label>
                  <select
                    value={glucoseContext}
                    onChange={(e) => setGlucoseContext(e.target.value as MeasurementContext)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none bg-white font-medium"
                  >
                    <option value="Fasting">Fasting</option>
                    <option value="Post-meal">Post-meal</option>
                    <option value="Random">Random</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* HbA1c */}
          {showHbA1c && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <label className="block text-xs font-bold text-slate-900 mb-1">
                HbA1c (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={hba1c}
                onChange={(e) => setHba1c(e.target.value)}
                placeholder="e.g. 5.7"
                className="w-full max-w-xs px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none bg-white"
              />
            </div>
          )}

          {/* Weight */}
          {showWeight && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g. 70.5"
                className="w-full max-w-xs px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none bg-white"
              />
            </div>
          )}

          {/* Oxygen Saturation */}
          {showOxygen && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Oxygen Saturation - SpO2 (%)
              </label>
              <input
                type="number"
                value={spo2}
                onChange={(e) => setSpo2(e.target.value)}
                placeholder="e.g. 98"
                className="w-full max-w-xs px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none bg-white"
              />
            </div>
          )}

          {/* Respiratory Rate */}
          {showRespiratoryRate && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Respiratory Rate (breaths/min)
              </label>
              <input
                type="number"
                value={respiratoryRate}
                onChange={(e) => setRespiratoryRate(e.target.value)}
                placeholder="e.g. 16"
                className="w-full max-w-xs px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none bg-white"
              />
            </div>
          )}

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none bg-white font-medium text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Time</label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none bg-white font-medium text-slate-900"
              />
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Measured after morning walk"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none bg-white"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto inline-flex items-center justify-center py-2.5 px-6 rounded-lg text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 transition-colors disabled:opacity-50 shadow-xs"
          >
            {saving ? 'Saving...' : 'Save Reading'}
          </button>
        </div>
      </form>
    </div>
  );
};
