import React, { useState, useEffect } from 'react';
import { UserAccount, PatientProfile, LaboratoryReport } from '../../types';
import { api } from '../../lib/api';
import { buildFHIRDiagnosticReport } from '../../lib/fhir';
import {
  FlaskConical,
  Upload,
  PlusCircle,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Search,
  FileText,
} from 'lucide-react';
import { FHIRInspectorModal } from '../common/FHIRInspectorModal';

interface LabDashboardProps {
  user: UserAccount;
}

export const LabDashboard: React.FC<LabDashboardProps> = ({ user }) => {
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [reports, setReports] = useState<LaboratoryReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [testName, setTestName] = useState('Hemoglobin A1c (HbA1c)');
  const [resultValue, setResultValue] = useState('');
  const [unit, setUnit] = useState('%');
  const [referenceRange, setReferenceRange] = useState('4.0 - 5.6 %');
  const [interpretation, setInterpretation] = useState<'Normal' | 'Abnormal' | 'Critical'>('Normal');
  const [laboratoryName, setLaboratoryName] = useState('National Clinical Pathology & Diagnostic Lab');
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [fileName, setFileName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // FHIR modal
  const [inspectorData, setInspectorData] = useState<{ title: string; resourceName: string; json: object } | null>(null);

  const standardTests = [
    { name: 'Hemoglobin A1c (HbA1c)', unit: '%', range: '4.0 - 5.6 %' },
    { name: 'Fasting Plasma Glucose', unit: 'mg/dL', range: '70 - 99 mg/dL' },
    { name: 'Lipid Panel - Total Cholesterol', unit: 'mg/dL', range: '< 200 mg/dL' },
    { name: 'Serum Creatinine', unit: 'mg/dL', range: '0.7 - 1.3 mg/dL' },
    { name: 'Arterial Blood Gas (PaO2)', unit: 'mmHg', range: '75 - 100 mmHg' },
    { name: 'Complete Blood Count (WBC)', unit: '10^3/uL', range: '4.5 - 11.0 10^3/uL' },
    { name: 'Serum Potassium', unit: 'mmol/L', range: '3.5 - 5.0 mmol/L' },
  ];

  useEffect(() => {
    async function loadData() {
      try {
        const [pts, reps] = await Promise.all([api.getAllPatients(), api.getLabReports()]);
        setPatients(pts);
        setReports(reps);
        if (pts.length > 0) {
          setSelectedPatientId(pts[0].id);
        }
      } catch (err) {
        console.error('Failed to load lab data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleTestChange = (name: string) => {
    setTestName(name);
    const found = standardTests.find((t) => t.name === name);
    if (found) {
      setUnit(found.unit);
      setReferenceRange(found.range);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !resultValue) {
      setFeedback({ text: 'Please choose a patient and enter the test result value.', type: 'error' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    const patient = patients.find((p) => p.id === selectedPatientId);
    const patientName = patient?.fullName || 'Patient';

    try {
      const created = await api.createLabReport({
        patientId: selectedPatientId,
        patientName,
        labStaffId: user.id,
        testName,
        resultValue,
        unit,
        referenceRange,
        interpretation,
        testDate,
        laboratoryName,
        fileName: fileName || undefined,
        status: 'Completed',
      });

      setReports([created, ...reports]);
      setFeedback({
        text: `Diagnostic report for ${patientName} (${testName}) successfully logged to FHIR server.`,
        type: 'success',
      });
      setResultValue('');
      setFileName('');
    } catch (err: any) {
      setFeedback({ text: err.message || 'Error submitting report', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-lg border border-purple-200">
            <FlaskConical className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">Diagnostic Pathology Portal</h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                Staff: {user.fullName}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Ingests real clinical test results and produces standards-compliant FHIR DiagnosticReport resources.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form to Enter Results & Upload */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Enter Diagnostic Test Result
            </h3>
            <p className="text-xs text-slate-500">Maps to FHIR DiagnosticReport (LOINC Coded)</p>
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmitReport} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Target Patient</label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                {patients.length === 0 ? (
                  <option value="">No patients registered yet</option>
                ) : (
                  patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} (ID: {p.userId.slice(0, 6)})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Diagnostic Test Name</label>
              <select
                value={testName}
                onChange={(e) => handleTestChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                {standardTests.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Result Value</label>
                <input
                  type="text"
                  required
                  value={resultValue}
                  onChange={(e) => setResultValue(e.target.value)}
                  placeholder="e.g. 6.8"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Unit of Measure</label>
                <input
                  type="text"
                  required
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reference Range</label>
              <input
                type="text"
                value={referenceRange}
                onChange={(e) => setReferenceRange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Interpretation</label>
                <select
                  value={interpretation}
                  onChange={(e: any) => setInterpretation(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="Normal">Normal</option>
                  <option value="Abnormal">Abnormal</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date of Test</label>
                <input
                  type="date"
                  required
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Laboratory Facility</label>
              <input
                type="text"
                value={laboratoryName}
                onChange={(e) => setLaboratoryName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            {/* Document Upload */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Attach Diagnostic PDF/Report Document (Optional)
              </label>
              <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                <Upload className="w-5 h-5 text-slate-400 mb-1" />
                <span className="text-[11px] text-slate-600 font-medium">
                  {fileName ? fileName : 'Click to select report document'}
                </span>
                <input type="file" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting || patients.length === 0}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-white bg-slate-900 hover:bg-purple-800 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{submitting ? 'Generating FHIR Record...' : 'Publish Diagnostic Report'}</span>
            </button>
          </form>
        </div>

        {/* Right 2 Columns: Reports Ingestion Feed */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Ingested Laboratory Reports ({reports.length})
              </h3>
              <p className="text-xs text-slate-500">Accessible by authorized physicians and patients</p>
            </div>
            <span className="text-xs font-mono text-slate-400">FHIR DiagnosticReport R4</span>
          </div>

          {reports.length === 0 ? (
            <div className="py-16 text-center bg-slate-50 rounded-xl border border-slate-200">
              <FlaskConical className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No laboratory reports published yet.</p>
              <p className="text-xs text-slate-500 mt-1">Use the panel on the left to enter actual laboratory findings.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[650px] overflow-y-auto pr-1">
              {reports.map((rep) => (
                <div key={rep.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-900">{rep.testName}</span>
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
                      Patient: <strong className="text-slate-900">{rep.patientName}</strong> • Result:{' '}
                      <span className="font-bold text-purple-700">{rep.resultValue} {rep.unit}</span> (Ref: {rep.referenceRange})
                    </p>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                      <span>Lab: {rep.laboratoryName}</span>
                      <span>•</span>
                      <span>Date: {rep.testDate}</span>
                      {rep.fileName && (
                        <>
                          <span>•</span>
                          <span className="text-slate-600 flex items-center gap-0.5">
                            <FileText className="w-3 h-3" /> {rep.fileName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      setInspectorData({
                        title: `FHIR DiagnosticReport: ${rep.testName}`,
                        resourceName: 'DiagnosticReport',
                        json: buildFHIRDiagnosticReport(rep),
                      })
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors self-start sm:self-auto"
                  >
                    <FileCode className="w-3.5 h-3.5 text-purple-700" />
                    <span>View FHIR JSON</span>
                  </button>
                </div>
              ))}
            </div>
          )}
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
