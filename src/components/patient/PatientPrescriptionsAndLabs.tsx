import React, { useState } from 'react';
import { Prescription, LaboratoryReport } from '../../types';
import { Pill, FlaskConical, Calendar, FileText, X, Download } from 'lucide-react';

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
  const [selectedReport, setSelectedReport] = useState<LaboratoryReport | null>(null);

  // If viewed specifically as Laboratory Reports
  if (initialTab === 'labs') {
    return (
      <div className="max-w-3xl space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="pb-5 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-900">Laboratory Reports</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              View your test results and reports.
            </p>
          </div>

          <div className="pt-5">
            {labReports.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 rounded-xl border border-slate-100">
                <FlaskConical className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-800">No laboratory reports yet.</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Reports from your laboratory will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {labReports.map((report) => (
                  <div
                    key={report.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{report.testName}</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Date: <span className="text-slate-700 font-medium">{report.testDate}</span> • Laboratory:{' '}
                        <span className="text-slate-700 font-medium">{report.laboratoryName}</span>
                      </p>
                    </div>

                    <button
                      onClick={() => setSelectedReport(report)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors self-start sm:self-center"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>View Report</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Simple Report Details Modal */}
        {selectedReport && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-xl space-y-4">
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedReport.testName}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedReport.testDate} • {selectedReport.laboratoryName}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Result:</span>
                    <strong className="text-slate-900 font-semibold">
                      {selectedReport.resultValue} {selectedReport.unit}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Reference Range:</span>
                    <span className="text-slate-700">{selectedReport.referenceRange}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Interpretation:</span>
                    <span
                      className={`font-semibold ${
                        selectedReport.interpretation === 'Normal'
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {selectedReport.interpretation}
                    </span>
                  </div>
                </div>

                {selectedReport.notes && (
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="font-semibold text-slate-700 block mb-1">Notes:</span>
                    <p className="text-slate-600 leading-relaxed">{selectedReport.notes}</p>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedReport(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Otherwise, default to Prescriptions view
  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="pb-5 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">Prescriptions</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            View medicines prescribed by your doctor.
          </p>
        </div>

        <div className="pt-5">
          {prescriptions.length === 0 ? (
            <div className="py-12 text-center bg-slate-50 rounded-xl border border-slate-100">
              <Pill className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No prescriptions yet.</h3>
              <p className="text-xs text-slate-500 mt-1">
                Medicines prescribed by your doctor will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {prescriptions.map((rx) => (
                <div
                  key={rx.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors shadow-2xs space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{rx.medication}</h4>
                      <p className="text-xs text-slate-600 mt-1">
                        <strong>Dosage:</strong> {rx.dosage}
                      </p>
                      <p className="text-xs text-slate-600">
                        <strong>How often to take it:</strong> {rx.frequency}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600">
                    <strong>Duration:</strong> {rx.duration}
                    {rx.instructions ? ` • ${rx.instructions}` : ''}
                  </p>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      Doctor: <strong className="text-slate-700">Dr. {rx.doctorName}</strong>
                    </span>
                    <span>Date: {rx.prescribedDate}</span>
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
