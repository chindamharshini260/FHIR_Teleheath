import React, { useState, useMemo } from 'react';
import { HealthReading, SupportedCondition } from '../../types';
import { api } from '../../lib/api';
import {
  Activity,
  CheckCircle2,
  Calendar,
  Clock,
  HeartPulse,
  Save,
  FileCode,
  Edit3,
  X,
  AlertCircle,
  PlusCircle,
} from 'lucide-react';

interface TodaysCheckinCardProps {
  patientId: string;
  conditions: SupportedCondition[];
  readings: HealthReading[];
  onReadingsAdded: (newReadings: HealthReading[]) => void;
  onNavigateToConditions: () => void;
  onInspectFHIR?: (reading: HealthReading) => void;
}

export const TodaysCheckinCard: React.FC<TodaysCheckinCardProps> = ({
  patientId,
  conditions,
  readings,
  onReadingsAdded,
  onNavigateToConditions,
  onInspectFHIR,
}) => {
  // Current real date
  const todayDateObj = new Date();
  const todayISO = todayDateObj.toISOString().split('T')[0];
  const formattedToday = todayDateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Check if any readings were logged today
  const todaysReadings = useMemo(() => {
    return (readings || []).filter((r) => r.date === todayISO);
  }, [readings, todayISO]);

  const hasCompletedToday = todaysReadings.length > 0;

  // Track whether form is open:
  // If not completed today, default isFormOpen = true so patient can immediately enter,
  // but if user closed it or wants to toggle:
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form input states - NO DUMMY VALUES
  const [glucose, setGlucose] = useState<string>('');
  const [glucoseContext, setGlucoseContext] = useState<string>('fasting');
  const [hba1c, setHba1c] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [systolic, setSystolic] = useState<string>('');
  const [diastolic, setDiastolic] = useState<string>('');
  const [heartRate, setHeartRate] = useState<string>('');
  const [spo2, setSpo2] = useState<string>('');
  const [respiratoryRate, setRespiratoryRate] = useState<string>('');

  // Automatically determine relevant readings based strictly on saved conditions
  const showGlucose = conditions.includes('Diabetes');
  const showHba1c = conditions.includes('Diabetes');
  const showWeight = conditions.includes('Diabetes');
  const showBloodPressure = conditions.includes('Hypertension');
  // De-duplicate Heart Rate if both Hypertension & COPD are present
  const showHeartRate = conditions.includes('Hypertension') || conditions.includes('COPD');
  const showSpo2 = conditions.includes('COPD');
  const showRespiratoryRate = conditions.includes('COPD');

  // Triggered when user clicks "[ Update Today's Readings ]"
  const handleStartUpdate = () => {
    // Populate form with existing readings from today
    const latestGlucose = todaysReadings.find((r) => r.parameterType === 'blood_glucose');
    if (latestGlucose) {
      setGlucose(latestGlucose.value?.toString() || '');
      if (latestGlucose.measurementContext) setGlucoseContext(latestGlucose.measurementContext);
    }
    const latestHba1c = todaysReadings.find((r) => r.parameterType === 'hba1c');
    if (latestHba1c) setHba1c(latestHba1c.value?.toString() || '');

    const latestWeight = todaysReadings.find((r) => r.parameterType === 'weight');
    if (latestWeight) setWeight(latestWeight.value?.toString() || '');

    const latestBP = todaysReadings.find((r) => r.parameterType === 'blood_pressure');
    if (latestBP) {
      if (latestBP.systolic) setSystolic(latestBP.systolic.toString());
      if (latestBP.diastolic) setDiastolic(latestBP.diastolic.toString());
    }

    const latestHR = todaysReadings.find((r) => r.parameterType === 'heart_rate');
    if (latestHR) setHeartRate(latestHR.value?.toString() || '');

    const latestSpo2 = todaysReadings.find((r) => r.parameterType === 'spo2');
    if (latestSpo2) setSpo2(latestSpo2.value?.toString() || '');

    const latestRR = todaysReadings.find((r) => r.parameterType === 'respiratory_rate');
    if (latestRR) setRespiratoryRate(latestRR.value?.toString() || '');

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsUpdating(true);
    setIsFormOpen(true);
  };

  const handleSaveCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 5); // HH:mm

    const batchPayload: Omit<HealthReading, 'id' | 'createdAt' | 'patientId'>[] = [];

    // Blood Pressure
    if (showBloodPressure && (systolic.trim() || diastolic.trim())) {
      const sysNum = parseFloat(systolic);
      const diaNum = parseFloat(diastolic);
      if (isNaN(sysNum) || isNaN(diaNum) || sysNum <= 0 || diaNum <= 0) {
        setErrorMessage('Please enter valid numeric values for Systolic and Diastolic Blood Pressure.');
        return;
      }
      batchPayload.push({
        parameterType: 'blood_pressure',
        systolic: sysNum,
        diastolic: diaNum,
        value: sysNum,
        unit: 'mmHg',
        date: todayISO,
        time: timeStr,
        source: 'Patient',
        notes: "Today's Check-in entry",
      });
    }

    // Heart Rate
    if (showHeartRate && heartRate.trim()) {
      const hrNum = parseFloat(heartRate);
      if (isNaN(hrNum) || hrNum <= 0) {
        setErrorMessage('Please enter a valid numeric Heart Rate.');
        return;
      }
      batchPayload.push({
        parameterType: 'heart_rate',
        value: hrNum,
        unit: 'bpm',
        date: todayISO,
        time: timeStr,
        source: 'Patient',
        notes: "Today's Check-in entry",
      });
    }

    // Blood Glucose
    if (showGlucose && glucose.trim()) {
      const glucNum = parseFloat(glucose);
      if (isNaN(glucNum) || glucNum <= 0) {
        setErrorMessage('Please enter a valid numeric Blood Glucose.');
        return;
      }
      batchPayload.push({
        parameterType: 'blood_glucose',
        value: glucNum,
        unit: 'mg/dL',
        date: todayISO,
        time: timeStr,
        measurementContext: glucoseContext as any,
        source: 'Patient',
        notes: `Today's Check-in (${glucoseContext})`,
      });
    }

    // HbA1c
    if (showHba1c && hba1c.trim()) {
      const a1cNum = parseFloat(hba1c);
      if (isNaN(a1cNum) || a1cNum <= 0) {
        setErrorMessage('Please enter a valid numeric HbA1c percentage.');
        return;
      }
      batchPayload.push({
        parameterType: 'hba1c',
        value: a1cNum,
        unit: '%',
        date: todayISO,
        time: timeStr,
        source: 'Patient',
        notes: "Today's Check-in entry",
      });
    }

    // Body Weight
    if (showWeight && weight.trim()) {
      const wtNum = parseFloat(weight);
      if (isNaN(wtNum) || wtNum <= 0) {
        setErrorMessage('Please enter a valid numeric Weight in kg.');
        return;
      }
      batchPayload.push({
        parameterType: 'weight',
        value: wtNum,
        unit: 'kg',
        date: todayISO,
        time: timeStr,
        source: 'Patient',
        notes: "Today's Check-in entry",
      });
    }

    // SpO2
    if (showSpo2 && spo2.trim()) {
      const spo2Num = parseFloat(spo2);
      if (isNaN(spo2Num) || spo2Num <= 0 || spo2Num > 100) {
        setErrorMessage('Please enter a valid SpO2 percentage between 1 and 100.');
        return;
      }
      batchPayload.push({
        parameterType: 'spo2',
        value: spo2Num,
        unit: '%',
        date: todayISO,
        time: timeStr,
        source: 'Patient',
        notes: "Today's Check-in entry",
      });
    }

    // Respiratory Rate
    if (showRespiratoryRate && respiratoryRate.trim()) {
      const rrNum = parseFloat(respiratoryRate);
      if (isNaN(rrNum) || rrNum <= 0) {
        setErrorMessage('Please enter a valid numeric Respiratory Rate.');
        return;
      }
      batchPayload.push({
        parameterType: 'respiratory_rate',
        value: rrNum,
        unit: 'breaths/min',
        date: todayISO,
        time: timeStr,
        source: 'Patient',
        notes: "Today's Check-in entry",
      });
    }

    if (batchPayload.length === 0) {
      setErrorMessage('Please enter at least one health reading for today before saving.');
      return;
    }

    try {
      setSaving(true);
      // Use saveTodayCheckin which updates in place if entry exists for today, preventing duplicates
      const savedReadings = await api.saveTodayCheckin(patientId, batchPayload, todayISO);
      onReadingsAdded(savedReadings);
      setSuccessMessage("Today's check-in recorded successfully. FHIR Observation resources created.");
      setIsUpdating(false);

      // Clear input fields
      setGlucose('');
      setHba1c('');
      setWeight('');
      setSystolic('');
      setDiastolic('');
      setHeartRate('');
      setSpo2('');
      setRespiratoryRate('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save health readings.');
    } finally {
      setSaving(false);
    }
  };

  const formatParamLabel = (type: string) => {
    switch (type) {
      case 'blood_pressure':
        return 'Blood Pressure';
      case 'blood_glucose':
        return 'Blood Glucose';
      case 'spo2':
        return 'Oxygen Saturation (SpO2)';
      case 'heart_rate':
        return 'Heart Rate';
      case 'respiratory_rate':
        return 'Respiratory Rate';
      case 'weight':
        return 'Body Weight';
      case 'hba1c':
        return 'HbA1c';
      default:
        return type.replace('_', ' ');
    }
  };

  // =========================================================================
  // CASE 1: IF NO CONDITION IS SELECTED
  // =========================================================================
  if (!conditions || conditions.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-teal-900">TODAY'S CHECK-IN</h3>
              <p className="text-xs text-slate-500 font-medium">{formattedToday}</p>
            </div>
          </div>
        </div>

        <div className="py-7 px-4 bg-slate-50 rounded-lg border border-slate-200 text-center">
          <HeartPulse className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-800">
            Please add your medical condition first to see the relevant health readings.
          </p>
          <p className="text-[11px] text-slate-500 mt-1 mb-3.5 max-w-md mx-auto">
            Today's Check-in uses your diagnosed conditions from Medical Conditions to automatically tailor your daily vital entries.
          </p>
          <button
            onClick={onNavigateToConditions}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Medical Condition</span>
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // CASE 2: TODAY'S READINGS ARE ALREADY ENTERED (NOT IN EDIT MODE)
  // =========================================================================
  if (hasCompletedToday && !isUpdating) {
    return (
      <div className="bg-white rounded-xl border border-teal-200 p-5 shadow-xs bg-gradient-to-r from-white via-white to-teal-50/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">TODAY'S CHECK-IN</h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  ✓ Completed
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{formattedToday}</p>
            </div>
          </div>

          <button
            onClick={handleStartUpdate}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50/40 text-xs font-semibold text-slate-700 hover:text-teal-900 transition-colors self-start sm:self-auto shadow-2xs"
          >
            <Edit3 className="w-3.5 h-3.5 text-teal-700" />
            <span>Update Today's Readings</span>
          </button>
        </div>

        {successMessage && (
          <div className="mb-3.5 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {todaysReadings.map((r) => (
            <div
              key={r.id}
              className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-teal-300 transition-colors"
            >
              <div className="flex items-center justify-between text-slate-500 text-[10px] mb-1">
                <span className="font-semibold uppercase truncate">{formatParamLabel(r.parameterType)}</span>
                {onInspectFHIR && (
                  <button
                    onClick={() => onInspectFHIR(r)}
                    className="text-slate-400 hover:text-teal-700 transition-colors"
                    title="Inspect FHIR Observation"
                  >
                    <FileCode className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-slate-900">
                  {r.parameterType === 'blood_pressure' ? `${r.systolic}/${r.diastolic}` : r.value}
                </span>
                <span className="text-xs text-slate-500 font-medium">{r.unit}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1">
                <Clock className="w-3 h-3" />
                <span>{r.time || 'Today'}</span>
                {r.measurementContext && (
                  <span className="capitalize">• {r.measurementContext}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // =========================================================================
  // CASE 3: NO READINGS ENTERED YET FOR TODAY OR PATIENT CLICKED UPDATE
  // =========================================================================
  return (
    <div className="bg-white rounded-xl border border-teal-300/80 p-5 shadow-xs relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-slate-100 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200/60">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-teal-900">TODAY'S CHECK-IN</h3>
              <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                {formattedToday}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Record your actual health readings for today.
            </p>
          </div>
        </div>

        {isUpdating && (
          <button
            onClick={() => {
              setIsUpdating(false);
              setErrorMessage(null);
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>
        )}
      </div>

      {/* If nothing entered yet for today, show clear prompt */}
      {!hasCompletedToday && (
        <div className="mb-4 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
          <span className="font-medium">No readings recorded for today.</span>
          <span className="text-[11px] text-slate-400">Enter your values below to complete today's check-in</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* QUICK ENTRY FORM: Parameters dynamically derived from conditions without asking disease */}
      <form onSubmit={handleSaveCheckin} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* DIABETES: Blood Glucose */}
          {showGlucose && (
            <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800">Blood Glucose</label>
                <span className="text-[10px] text-teal-800 font-semibold bg-teal-50 px-1.5 py-0.5 rounded">
                  mg/dL
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="1"
                  placeholder="Enter value"
                  value={glucose}
                  onChange={(e) => setGlucose(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-900 focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
                <select
                  value={glucoseContext}
                  onChange={(e) => setGlucoseContext(e.target.value)}
                  className="px-2 py-1.5 bg-white border border-slate-200 rounded-md text-[11px] text-slate-700 focus:outline-hidden focus:border-teal-500"
                >
                  <option value="fasting">Fasting</option>
                  <option value="post_meal">Post-meal</option>
                  <option value="random">Random</option>
                </select>
              </div>
            </div>
          )}

          {/* DIABETES: HbA1c */}
          {showHba1c && (
            <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800">HbA1c</label>
                <span className="text-[10px] text-teal-800 font-semibold bg-teal-50 px-1.5 py-0.5 rounded">%</span>
              </div>
              <input
                type="number"
                step="0.1"
                placeholder="Enter value"
                value={hba1c}
                onChange={(e) => setHba1c(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-900 focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>
          )}

          {/* DIABETES: Weight */}
          {showWeight && (
            <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800">Weight</label>
                <span className="text-[10px] text-teal-800 font-semibold bg-teal-50 px-1.5 py-0.5 rounded">kg</span>
              </div>
              <input
                type="number"
                step="0.1"
                placeholder="Enter value"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-900 focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>
          )}

          {/* HYPERTENSION: Blood Pressure (Systolic & Diastolic) */}
          {showBloodPressure && (
            <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800">Blood Pressure</label>
                <span className="text-[10px] text-teal-800 font-semibold bg-teal-50 px-1.5 py-0.5 rounded">
                  mmHg
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block mb-0.5">Systolic</span>
                  <input
                    type="number"
                    step="1"
                    placeholder="Enter value"
                    value={systolic}
                    onChange={(e) => setSystolic(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-900 focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block mb-0.5">Diastolic</span>
                  <input
                    type="number"
                    step="1"
                    placeholder="Enter value"
                    value={diastolic}
                    onChange={(e) => setDiastolic(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-900 focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* HYPERTENSION / COPD: Heart Rate (De-duplicated) */}
          {showHeartRate && (
            <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800">Heart Rate</label>
                <span className="text-[10px] text-teal-800 font-semibold bg-teal-50 px-1.5 py-0.5 rounded">bpm</span>
              </div>
              <input
                type="number"
                step="1"
                placeholder="Enter value"
                value={heartRate}
                onChange={(e) => setHeartRate(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-900 focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>
          )}

          {/* COPD: SpO2 */}
          {showSpo2 && (
            <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800">SpO2</label>
                <span className="text-[10px] text-teal-800 font-semibold bg-teal-50 px-1.5 py-0.5 rounded">%</span>
              </div>
              <input
                type="number"
                step="1"
                placeholder="Enter value"
                value={spo2}
                onChange={(e) => setSpo2(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-900 focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>
          )}

          {/* COPD: Respiratory Rate */}
          {showRespiratoryRate && (
            <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800">Respiratory Rate</label>
                <span className="text-[10px] text-teal-800 font-semibold bg-teal-50 px-1.5 py-0.5 rounded">
                  breaths/min
                </span>
              </div>
              <input
                type="number"
                step="1"
                placeholder="Enter value"
                value={respiratoryRate}
                onChange={(e) => setRespiratoryRate(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-900 focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>
          )}
        </div>

        {/* Form Footer */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
          <span className="text-[11px] text-slate-400">
            Actual readings create HL7 FHIR R4 Observations in your longitudinal health record.
          </span>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : "Save Today's Check-in"}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
