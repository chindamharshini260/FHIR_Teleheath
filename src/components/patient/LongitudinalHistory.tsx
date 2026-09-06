import React, { useState } from 'react';
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
  FileText,
  FlaskConical,
  Pill,
  Video,
  Filter,
  CheckCircle2,
  FolderOpen,
} from 'lucide-react';

interface TimelineEvent {
  id: string;
  type: 'condition' | 'observation' | 'lab_report' | 'encounter' | 'prescription';
  timestamp: string;
  title: string;
  details: string;
  source: string;
  badgeColor: string;
}

interface LongitudinalHistoryProps {
  conditions: SupportedCondition[];
  readings: HealthReading[];
  labReports: LaboratoryReport[];
  appointments: Appointment[];
  encounters: TeleconsultationEncounter[];
  prescriptions: Prescription[];
}

export const LongitudinalHistory: React.FC<LongitudinalHistoryProps> = ({
  conditions,
  readings,
  labReports,
  appointments,
  encounters,
  prescriptions,
}) => {
  const [filterType, setFilterType] = useState<string>('all');

  // Aggregate all events
  const events: TimelineEvent[] = [];

  // Conditions
  conditions.forEach((c) => {
    events.push({
      id: `ev-cond-${c}`,
      type: 'condition',
      timestamp: new Date().toISOString(), // active
      title: `Diagnosed Condition: ${c}`,
      details: `Active chronic condition recorded in medical profile under SNOMED CT terminology.`,
      source: 'Patient Record',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    });
  });

  // Observations
  readings.forEach((r) => {
    const valDisplay =
      r.parameterType === 'blood_pressure'
        ? `${r.systolic}/${r.diastolic} mmHg`
        : `${r.value} ${r.unit}${r.measurementContext ? ` (${r.measurementContext})` : ''}`;

    events.push({
      id: `ev-obs-${r.id}`,
      type: 'observation',
      timestamp: `${r.date}T${r.time || '00:00'}:00Z`,
      title: `Vital Sign Reading: ${r.parameterType.replace('_', ' ').toUpperCase()}`,
      details: `${valDisplay}${r.notes ? ` • Note: "${r.notes}"` : ''}`,
      source: r.source || 'Patient Monitored',
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
    });
  });

  // Lab reports
  labReports.forEach((l) => {
    events.push({
      id: `ev-lab-${l.id}`,
      type: 'lab_report',
      timestamp: `${l.testDate}T09:00:00Z`,
      title: `Laboratory Report: ${l.testName}`,
      details: `Result: ${l.resultValue} ${l.unit} (Ref: ${l.referenceRange}) • Interpretation: ${l.interpretation}`,
      source: l.laboratoryName,
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    });
  });

  // Prescriptions
  prescriptions.forEach((p) => {
    events.push({
      id: `ev-rx-${p.id}`,
      type: 'prescription',
      timestamp: `${p.prescribedDate}T12:00:00Z`,
      title: `Medication Prescribed: ${p.medication}`,
      details: `${p.dosage}, ${p.frequency} for ${p.duration}. Instructions: ${p.instructions}`,
      source: `Dr. ${p.doctorName}`,
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    });
  });

  // Encounters / Consultations
  encounters.forEach((e) => {
    events.push({
      id: `ev-enc-${e.id}`,
      type: 'encounter',
      timestamp: e.startTime,
      title: `Telehealth Consultation Encounter`,
      details: `Clinical status: ${e.status}. ${e.clinicalNotes ? `Notes: "${e.clinicalNotes}"` : ''}`,
      source: 'Telehealth Platform',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    });
  });

  // Sort descending by timestamp
  const sortedEvents = events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const filteredEvents =
    filterType === 'all'
      ? sortedEvents
      : sortedEvents.filter((e) => e.type === filterType);

  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'condition':
        return <Activity className="w-4 h-4 text-amber-600" />;
      case 'observation':
        return <Activity className="w-4 h-4 text-teal-600" />;
      case 'lab_report':
        return <FlaskConical className="w-4 h-4 text-purple-600" />;
      case 'prescription':
        return <Pill className="w-4 h-4 text-blue-600" />;
      case 'encounter':
        return <Video className="w-4 h-4 text-rose-600" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Longitudinal Health Timeline</h3>
          <p className="text-xs text-slate-500">
            Unified chronological medical events mapped to FHIR R4 clinical specifications
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
          {[
            { id: 'all', label: 'All Records' },
            { id: 'observation', label: 'Vitals' },
            { id: 'lab_report', label: 'Lab Reports' },
            { id: 'prescription', label: 'Prescriptions' },
            { id: 'encounter', label: 'Consultations' },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilterType(btn.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                filterType === btn.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-6">
        {filteredEvents.length === 0 ? (
          <div className="py-16 text-center bg-slate-50 rounded-xl border border-slate-200">
            <FolderOpen className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-800">
              {conditions.length === 0
                ? 'Please select your medical condition(s) before entering health readings.'
                : 'No readings recorded yet.'}
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {conditions.length === 0
                ? 'Select your diagnosed condition in Medical Conditions to start monitoring.'
                : 'Events will chronologically appear here as you log vital readings, receive diagnostic lab reports, and attend consultations.'}
            </p>
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-200 ml-4 space-y-6">
            {filteredEvents.map((evt) => (
              <div key={evt.id} className="relative pl-6 group">
                {/* Node icon dot */}
                <div className="absolute -left-[17px] top-1 w-8 h-8 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center shadow-xs group-hover:border-teal-500 transition-colors">
                  {getEventIcon(evt.type)}
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <h4 className="text-sm font-bold text-slate-900">{evt.title}</h4>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(evt.timestamp).toLocaleDateString()} {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 font-medium mb-2">{evt.details}</p>

                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-200/60">
                    <span className="text-slate-500">Source: <strong className="text-slate-700">{evt.source}</strong></span>
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase ${evt.badgeColor}`}>
                      {evt.type.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
