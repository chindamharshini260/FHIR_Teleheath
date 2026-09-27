import React, { useState, useMemo } from 'react';
import {
  HealthReading,
  SupportedCondition,
  LaboratoryReport,
  Appointment,
  Prescription,
  TeleconsultationEncounter,
} from '../../types';
import {
  Activity,
  Calendar,
  Clock,
  FlaskConical,
  Pill,
  Video,
  FileText,
} from 'lucide-react';

interface LongitudinalHistoryProps {
  conditions: SupportedCondition[];
  readings: HealthReading[];
  labReports?: LaboratoryReport[];
  appointments?: Appointment[];
  encounters?: TeleconsultationEncounter[];
  prescriptions?: Prescription[];
}

type HistoryFilter = 'all' | 'readings' | 'labs' | 'prescriptions' | 'consultations';

interface MeasurementItem {
  label: string;
  value: string;
}

interface GroupedReadingEntry {
  id: string;
  type: 'reading';
  date: string; // YYYY-MM-DD
  time?: string;
  displayDate: string;
  displayTime: string;
  condition?: string;
  measurements: MeasurementItem[];
  notes?: string;
  timestamp: number;
}

interface OtherHistoryEntry {
  id: string;
  type: 'lab' | 'prescription' | 'consultation';
  date: string;
  time?: string;
  displayDate: string;
  displayTime: string;
  title: string;
  primaryDetails: string;
  secondaryDetails?: string;
  tertiaryDetails?: string;
  timestamp: number;
}

type TimelineEntry = GroupedReadingEntry | OtherHistoryEntry;

// Date format helper: "27 Sep 2026"
const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

// Time format helper: "1:35 PM"
const formatTime = (timeStr?: string): string => {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();
  if (trimmed.toLowerCase().includes('am') || trimmed.toLowerCase().includes('pm')) {
    return trimmed;
  }
  const parts = trimmed.split(':');
  if (parts.length >= 2) {
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1].padStart(2, '0');
    if (!isNaN(hours)) {
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${hours}:${minutes} ${ampm}`;
    }
  }
  return trimmed;
};

// Day header helper: "TODAY", "YESTERDAY", or "27 Sep 2026"
const getDayHeader = (dateStr: string): string => {
  try {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    if (dateStr === todayStr) return 'TODAY';
    if (dateStr === yesterdayStr) return 'YESTERDAY';
    return formatDate(dateStr);
  } catch {
    return formatDate(dateStr);
  }
};

export const LongitudinalHistory: React.FC<LongitudinalHistoryProps> = ({
  conditions = [],
  readings = [],
  labReports = [],
  encounters = [],
  prescriptions = [],
}) => {
  const [filter, setFilter] = useState<HistoryFilter>('all');

  // Helper to infer the most relevant condition name for a set of readings
  const getRelevantCondition = (paramTypes: string[]): string | undefined => {
    if (conditions.length === 0) return undefined;
    if (conditions.length === 1) return conditions[0];

    const hasBPOrHR = paramTypes.includes('blood_pressure') || paramTypes.includes('heart_rate');
    const hasGlucose = paramTypes.includes('blood_glucose') || paramTypes.includes('hba1c');
    const hasRespiratory = paramTypes.includes('spo2') || paramTypes.includes('respiratory_rate');

    if (hasBPOrHR && conditions.includes('Hypertension')) return 'Hypertension';
    if (hasGlucose && conditions.includes('Diabetes')) return 'Diabetes';
    if (hasRespiratory && conditions.includes('COPD')) return 'COPD';
    if (hasRespiratory && conditions.includes('Asthma')) return 'Asthma';

    return conditions.join(', ');
  };

  const timelineEntries: TimelineEntry[] = useMemo(() => {
    const result: TimelineEntry[] = [];

    // 1. Group health readings by (date + time)
    // Key: `${date}__${time || ''}`
    const groupedReadingsMap = new Map<string, HealthReading[]>();

    readings.forEach((r) => {
      const key = `${r.date}__${r.time || ''}`;
      if (!groupedReadingsMap.has(key)) {
        groupedReadingsMap.set(key, []);
      }
      groupedReadingsMap.get(key)!.push(r);
    });

    groupedReadingsMap.forEach((readingList, groupKey) => {
      const first = readingList[0];
      const paramTypes: string[] = [];
      const measurements: MeasurementItem[] = [];
      const notesList: string[] = [];

      readingList.forEach((r) => {
        paramTypes.push(r.parameterType);

        if (r.notes && !notesList.includes(r.notes)) {
          notesList.push(r.notes);
        }

        switch (r.parameterType) {
          case 'blood_pressure':
            measurements.push({
              label: 'Blood Pressure',
              value: `${r.systolic}/${r.diastolic} mmHg`,
            });
            break;
          case 'heart_rate':
            measurements.push({
              label: 'Heart Rate',
              value: `${r.value} bpm`,
            });
            break;
          case 'blood_glucose':
            measurements.push({
              label: 'Blood Glucose',
              value: `${r.value} mg/dL${r.measurementContext ? ` (${r.measurementContext})` : ''}`,
            });
            break;
          case 'hba1c':
            measurements.push({
              label: 'HbA1c',
              value: `${r.value}%`,
            });
            break;
          case 'weight':
            measurements.push({
              label: 'Weight',
              value: `${r.value} kg`,
            });
            break;
          case 'spo2':
            measurements.push({
              label: 'Oxygen (SpO2)',
              value: `${r.value}%`,
            });
            break;
          case 'respiratory_rate':
            measurements.push({
              label: 'Respiratory Rate',
              value: `${r.value} breaths/min`,
            });
            break;
          default:
            measurements.push({
              label: String(r.parameterType)
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (c) => c.toUpperCase()),
              value: `${r.value ?? ''} ${r.unit ?? ''}`.trim(),
            });
        }
      });

      const parsedTimestamp = new Date(`${first.date}T${first.time || '00:00'}`).getTime();

      result.push({
        id: `group-${groupKey}`,
        type: 'reading',
        date: first.date,
        time: first.time,
        displayDate: formatDate(first.date),
        displayTime: formatTime(first.time),
        condition: getRelevantCondition(paramTypes),
        measurements,
        notes: notesList.length > 0 ? notesList.join(' • ') : undefined,
        timestamp: isNaN(parsedTimestamp) ? 0 : parsedTimestamp,
      });
    });

    // 2. Prescriptions
    prescriptions.forEach((p) => {
      const parsedTimestamp = new Date(`${p.prescribedDate}T00:00`).getTime();
      result.push({
        id: `rx-${p.id}`,
        type: 'prescription',
        date: p.prescribedDate,
        displayDate: formatDate(p.prescribedDate),
        displayTime: '',
        title: p.medication,
        primaryDetails: `${p.dosage} • ${p.frequency}`,
        secondaryDetails: `Duration: ${p.duration}${p.instructions ? ` • ${p.instructions}` : ''}`,
        tertiaryDetails: `Prescribed by Dr. ${p.doctorName}`,
        timestamp: isNaN(parsedTimestamp) ? 0 : parsedTimestamp,
      });
    });

    // 3. Lab Reports
    labReports.forEach((l) => {
      const parsedTimestamp = new Date(`${l.testDate}T00:00`).getTime();
      result.push({
        id: `lab-${l.id}`,
        type: 'lab',
        date: l.testDate,
        displayDate: formatDate(l.testDate),
        displayTime: '',
        title: l.testName,
        primaryDetails: `${l.resultValue} ${l.unit} (${l.interpretation})`,
        secondaryDetails: `Laboratory: ${l.laboratoryName}`,
        tertiaryDetails: l.referenceRange ? `Reference: ${l.referenceRange}` : undefined,
        timestamp: isNaN(parsedTimestamp) ? 0 : parsedTimestamp,
      });
    });

    // 4. Consultations
    encounters.forEach((e) => {
      const datePart = e.startTime ? e.startTime.slice(0, 10) : '';
      const timePart = e.startTime && e.startTime.length > 11 ? e.startTime.slice(11, 16) : undefined;
      const parsedTimestamp = new Date(e.startTime || datePart).getTime();

      result.push({
        id: `enc-${e.id}`,
        type: 'consultation',
        date: datePart,
        time: timePart,
        displayDate: formatDate(datePart),
        displayTime: formatTime(timePart),
        title: 'Doctor Consultation',
        primaryDetails: `Status: ${e.status}`,
        secondaryDetails: e.clinicalNotes ? `Notes: ${e.clinicalNotes}` : undefined,
        timestamp: isNaN(parsedTimestamp) ? 0 : parsedTimestamp,
      });
    });

    // Sort descending by timestamp / date
    return result.sort((a, b) => b.timestamp - a.timestamp);
  }, [readings, prescriptions, labReports, encounters, conditions]);

  // Filter items
  const filteredEntries = useMemo(() => {
    if (filter === 'all') return timelineEntries;
    if (filter === 'readings') return timelineEntries.filter((e) => e.type === 'reading');
    if (filter === 'labs') return timelineEntries.filter((e) => e.type === 'lab');
    if (filter === 'prescriptions') return timelineEntries.filter((e) => e.type === 'prescription');
    if (filter === 'consultations') return timelineEntries.filter((e) => e.type === 'consultation');
    return timelineEntries;
  }, [timelineEntries, filter]);

  // Group filtered entries by day header (e.g. TODAY, YESTERDAY, 18 Sep 2026)
  const groupedByDay = useMemo(() => {
    const groups: { dayHeader: string; date: string; entries: TimelineEntry[] }[] = [];

    filteredEntries.forEach((entry) => {
      const dayHeader = getDayHeader(entry.date);
      const existing = groups.find((g) => g.dayHeader === dayHeader);
      if (existing) {
        existing.entries.push(entry);
      } else {
        groups.push({ dayHeader, date: entry.date, entries: [entry] });
      }
    });

    return groups;
  }, [filteredEntries]);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        {/* Heading & Subtitle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Health History</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              View your previous health readings and medical information.
            </p>
          </div>

          {/* Clean, Useful Filter Buttons (No confusing counts) */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === 'all'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('readings')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === 'readings'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Readings
            </button>
            <button
              onClick={() => setFilter('labs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === 'labs'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Lab Reports
            </button>
            <button
              onClick={() => setFilter('prescriptions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === 'prescriptions'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Prescriptions
            </button>
            <button
              onClick={() => setFilter('consultations')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === 'consultations'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Consultations
            </button>
          </div>
        </div>

        {/* Chronological Timeline */}
        <div className="pt-6">
          {filteredEntries.length === 0 ? (
            <div className="py-14 text-center bg-slate-50 rounded-xl border border-slate-100">
              <Activity className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No health history records yet.</h3>
              <p className="text-xs text-slate-500 mt-1">
                Your recorded health measurements and medical visits will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedByDay.map((group) => (
                <div key={group.dayHeader} className="space-y-3">
                  {/* Day Header (e.g. TODAY, YESTERDAY, 18 Sep 2026) */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                      {group.dayHeader}
                    </span>
                    <div className="flex-1 h-px bg-slate-100" />
                  </div>

                  {/* Entries for this Day */}
                  <div className="space-y-3">
                    {group.entries.map((entry) => {
                      if (entry.type === 'reading') {
                        return (
                          <div
                            key={entry.id}
                            className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition-colors"
                          >
                            {/* Top row: Date & Time */}
                            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                              <span className="font-semibold text-slate-700">
                                {entry.displayDate}
                              </span>
                              {entry.displayTime && (
                                <span className="font-medium text-slate-500">
                                  {entry.displayTime}
                                </span>
                              )}
                            </div>

                            {/* Condition (shown once) */}
                            {entry.condition && (
                              <div className="mb-3">
                                <span className="text-xs font-semibold text-teal-800">
                                  {entry.condition}
                                </span>
                              </div>
                            )}

                            {/* Grouped Measurements (e.g. Blood Pressure + Heart Rate together) */}
                            <div className="divide-y divide-slate-100 pt-1">
                              {entry.measurements.map((m, idx) => (
                                <div
                                  key={idx}
                                  className="py-1.5 flex items-center justify-between text-sm first:pt-0 last:pb-0"
                                >
                                  <span className="text-slate-600 font-medium text-xs">
                                    {m.label}
                                  </span>
                                  <span className="text-slate-900 font-bold text-sm tracking-tight">
                                    {m.value}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Optional Note */}
                            {entry.notes && (
                              <p className="text-xs text-slate-500 mt-2.5 pt-2 border-t border-slate-100 italic">
                                Note: {entry.notes}
                              </p>
                            )}
                          </div>
                        );
                      }

                      if (entry.type === 'prescription') {
                        return (
                          <div
                            key={entry.id}
                            className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition-colors"
                          >
                            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                                <Pill className="w-3.5 h-3.5 text-teal-700" />
                                {entry.displayDate}
                              </span>
                              <span className="text-[11px] font-semibold text-teal-700">
                                Prescription
                              </span>
                            </div>

                            <h4 className="text-sm font-bold text-slate-900 mt-1">
                              {entry.title}
                            </h4>
                            <p className="text-xs text-slate-700 font-medium mt-1">
                              {entry.primaryDetails}
                            </p>
                            {entry.secondaryDetails && (
                              <p className="text-xs text-slate-500 mt-0.5">
                                {entry.secondaryDetails}
                              </p>
                            )}
                            {entry.tertiaryDetails && (
                              <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                                {entry.tertiaryDetails}
                              </p>
                            )}
                          </div>
                        );
                      }

                      if (entry.type === 'lab') {
                        return (
                          <div
                            key={entry.id}
                            className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition-colors"
                          >
                            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                                <FlaskConical className="w-3.5 h-3.5 text-teal-700" />
                                {entry.displayDate}
                              </span>
                              <span className="text-[11px] font-semibold text-teal-700">
                                Laboratory Report
                              </span>
                            </div>

                            <div className="flex items-baseline justify-between gap-2 mt-1">
                              <h4 className="text-sm font-bold text-slate-900">{entry.title}</h4>
                              <span className="text-sm font-bold text-slate-900">
                                {entry.primaryDetails}
                              </span>
                            </div>
                            {entry.secondaryDetails && (
                              <p className="text-xs text-slate-500 mt-1">
                                {entry.secondaryDetails}
                              </p>
                            )}
                            {entry.tertiaryDetails && (
                              <p className="text-[11px] text-slate-500 mt-1">
                                {entry.tertiaryDetails}
                              </p>
                            )}
                          </div>
                        );
                      }

                      if (entry.type === 'consultation') {
                        return (
                          <div
                            key={entry.id}
                            className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition-colors"
                          >
                            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                                <Video className="w-3.5 h-3.5 text-teal-700" />
                                {entry.displayDate}
                              </span>
                              {entry.displayTime && (
                                <span className="font-medium text-slate-500">
                                  {entry.displayTime}
                                </span>
                              )}
                            </div>

                            <h4 className="text-sm font-bold text-slate-900 mt-1">
                              {entry.title}
                            </h4>
                            <p className="text-xs text-slate-700 font-medium mt-1">
                              {entry.primaryDetails}
                            </p>
                            {entry.secondaryDetails && (
                              <p className="text-xs text-slate-500 mt-1">
                                {entry.secondaryDetails}
                              </p>
                            )}
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
