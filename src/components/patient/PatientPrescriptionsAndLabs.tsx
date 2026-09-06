import React, { useState } from 'react';
import { Prescription, LaboratoryReport } from '../../types';
import { Pill, FlaskConical, Calendar, FileCode, CheckCircle2 } from 'lucide-react';
import { buildFHIRMedicationRequest, buildFHIRDiagnosticReport } from '../../lib/fhir';
import { FHIRInspectorModal } from '../common/FHIRInspectorModal';

interface PatientPrescriptionsAndLabsProps {
  prescriptions: Prescription[];
  labReports: LaboratoryReport[];
  initialTab?: 'prescriptions' | 'labs';
}

export const PatientPrescriptionsAndLabs: React.FC<PatientPrescriptionsAndLabsProps> = ({
  prescriptions,
  labReports,
  initialTab = 'prescriptions',
}) => {
  const [activeTab, setActiveTab] = useState<'prescriptions' | 'labs'>(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [inspectorData, setInspectorData] = useState<{ title: string; resourceName: string; json: object } | null>(null);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('prescriptions')}
            className={`flex items-center gap-2 pb-2 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'prescriptions'
                ? 'border-teal-600 text-teal-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Pill className="w-4 h-4" />
            <span>Prescriptions ({prescriptions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('labs')}
            className={`flex items-center gap-2 pb-2 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'labs'
                ? 'border-teal-600 text-teal-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FlaskConical className="w-4 h-4" />
            <span>Laboratory Reports ({labReports.length})</span>
          </button>
        </div>
        <span className="text-xs font-mono text-slate-400 hidden sm:inline">FHIR Interoperable Record</span>
      </div>

      {/* Prescriptions Tab */}
      {activeTab === 'prescriptions' && (
        <div>
          {prescriptions.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
              <Pill className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-slate-700">No active prescriptions</h4>
              <p className="text-xs text-slate-500 mt-1">Prescriptions authorized by your physician will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {prescriptions.map((rx) => (
                <div key={rx.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:border-slate-300 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{rx.medication}</h4>
                      <p className="text-xs text-teal-700 font-semibold">{rx.dosage} • {rx.frequency}</p>
                    </div>
                    <button
                      onClick={() =>
                        setInspectorData({
                          title: `FHIR MedicationRequest: ${rx.medication}`,
                          resourceName: 'MedicationRequest',
                          json: buildFHIRMedicationRequest(rx),
                        })
                      }
                      className="p-1.5 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-teal-50 transition-colors"
                      title="Inspect FHIR MedicationRequest JSON"
                    >
                      <FileCode className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 mb-3">
                    Duration: <strong className="text-slate-800">{rx.duration}</strong>. Instructions: {rx.instructions}
                  </p>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Prescribed by: <strong className="text-slate-700">Dr. {rx.doctorName}</strong></span>
                    <span>{rx.prescribedDate}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lab Reports Tab */}
      {activeTab === 'labs' && (
        <div>
          {labReports.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
              <FlaskConical className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-slate-700">No laboratory reports filed</h4>
              <p className="text-xs text-slate-500 mt-1">Diagnostic pathology and laboratory results will appear here once submitted by laboratory staff.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {labReports.map((rep) => (
                <div key={rep.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-slate-900">{rep.testName}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          rep.interpretation === 'Normal'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rep.interpretation === 'Critical'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {rep.interpretation}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700">
                      Result: <strong className="text-slate-900">{rep.resultValue} {rep.unit}</strong> • Reference Range: {rep.referenceRange}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Laboratory: {rep.laboratoryName} • Date: {rep.testDate}
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      setInspectorData({
                        title: `FHIR DiagnosticReport: ${rep.testName}`,
                        resourceName: 'DiagnosticReport',
                        json: buildFHIRDiagnosticReport(rep),
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors self-start sm:self-auto"
                  >
                    <FileCode className="w-3.5 h-3.5 text-teal-700" />
                    <span>View FHIR Report</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FHIR Modal Inspector */}
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
