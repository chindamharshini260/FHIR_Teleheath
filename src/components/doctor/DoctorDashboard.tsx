import React, { useState, useEffect } from 'react';
import {
  UserAccount,
  PatientProfile,
  HealthReading,
  SupportedCondition,
  Appointment,
  Prescription,
  LaboratoryReport,
  AIRiskAssessment,
  TeleconsultationEncounter,
} from '../../types';
import { api } from '../../lib/api';
import { runAIRiskAssessment } from '../../lib/aiRiskEngine';
import { buildFHIRPatient, buildFHIRObservation, buildFHIRMedicationRequest, buildFHIRDiagnosticReport } from '../../lib/fhir';
import {
  Stethoscope,
  Search,
  User,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  Pill,
  Video,
  FileCode,
  TrendingUp,
  Brain,
  ShieldAlert,
  PlusCircle,
  X,
} from 'lucide-react';
import { HealthTrendsView } from '../patient/HealthTrendsView';
import { LongitudinalHistory } from '../patient/LongitudinalHistory';
import { VideoConsultationRoom } from '../common/VideoConsultationRoom';
import { FHIRInspectorModal } from '../common/FHIRInspectorModal';

interface DoctorDashboardProps {
  user: UserAccount;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({ user }) => {
  // If doctor status is PENDING, show clinical hold screen
  const isPending = user.doctorStatus === 'PENDING';

  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected patient data
  const [readings, setReadings] = useState<HealthReading[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [labReports, setLabReports] = useState<LaboratoryReport[]>([]);
  const [aiAssessments, setAiAssessments] = useState<AIRiskAssessment[]>([]);
  const [encounters, setEncounters] = useState<TeleconsultationEncounter[]>([]);

  // Navigation inside doctor view
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'timeline' | 'ai_risk' | 'labs' | 'prescriptions'>('overview');

  // Video Consultation
  const [activeVideoSession, setActiveVideoSession] = useState<{ patientId: string; patientName: string; apptId?: string } | null>(null);

  // New Prescription Modal
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [rxMedication, setRxMedication] = useState('');
  const [rxDosage, setRxDosage] = useState('');
  const [rxFrequency, setRxFrequency] = useState('');
  const [rxDuration, setRxDuration] = useState('');
  const [rxInstructions, setRxInstructions] = useState('');
  const [savingRx, setSavingRx] = useState(false);

  // AI assessment trigger state
  const [assessingCondition, setAssessingCondition] = useState<SupportedCondition>('Hypertension');
  const [evaluatingAI, setEvaluatingAI] = useState(false);
  const [currentAIAssessment, setCurrentAIAssessment] = useState<AIRiskAssessment | null>(null);

  // FHIR modal
  const [inspectorData, setInspectorData] = useState<{ title: string; resourceName: string; json: object } | null>(null);

  useEffect(() => {
    if (!isPending) {
      loadPatients();
    }
  }, [isPending]);

  const loadPatients = async () => {
    try {
      const allPatients = await api.getAllPatients();
      setPatients(allPatients);
      if (allPatients.length > 0 && !selectedPatient) {
        selectPatient(allPatients[0]);
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
    }
  };

  const selectPatient = async (patient: PatientProfile) => {
    setSelectedPatient(patient);
    setCurrentAIAssessment(null);
    try {
      const [rds, appts, rxs, labs, ais] = await Promise.all([
        api.getPatientReadings(patient.id),
        api.getAppointments({ patientId: patient.id }),
        api.getPrescriptions({ patientId: patient.id }),
        api.getLabReports(patient.id),
        api.getAIAssessments(patient.id),
      ]);
      setReadings(rds);
      setAppointments(appts);
      setPrescriptions(rxs);
      setLabReports(labs);
      setAiAssessments(ais);
      if (ais.length > 0) {
        setCurrentAIAssessment(ais[0]);
      }
      if (patient.conditions.length > 0) {
        setAssessingCondition(patient.conditions[0]);
      }
    } catch (err) {
      console.error('Error loading patient details:', err);
    }
  };

  const handleRunAI = async () => {
    if (!selectedPatient) return;
    setEvaluatingAI(true);
    try {
      // Deterministic, clinical assessment with ZERO Math.random()
      const assessment = runAIRiskAssessment({
        patient: selectedPatient,
        readings,
        condition: assessingCondition,
      });

      // Save to persistence
      const saved = await api.saveAIAssessment(assessment);
      setCurrentAIAssessment(saved);
      setAiAssessments([saved, ...aiAssessments]);
    } catch (err) {
      console.error('AI Assessment evaluation error:', err);
    } finally {
      setEvaluatingAI(false);
    }
  };

  const handleCreatePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setSavingRx(true);
    try {
      const newRx = await api.createPrescription({
        patientId: selectedPatient.id,
        patientName: selectedPatient.fullName,
        doctorId: user.id,
        doctorName: user.fullName,
        medication: rxMedication,
        dosage: rxDosage,
        frequency: rxFrequency,
        duration: rxDuration,
        instructions: rxInstructions,
        prescribedDate: new Date().toISOString().split('T')[0],
      });
      setPrescriptions([newRx, ...prescriptions]);
      setShowPrescriptionModal(false);
      setRxMedication('');
      setRxDosage('');
      setRxFrequency('');
      setRxDuration('');
      setRxInstructions('');
    } catch (err) {
      console.error('Error saving prescription:', err);
    } finally {
      setSavingRx(false);
    }
  };

  const handleUpdateAppointment = async (apptId: string, status: Appointment['status']) => {
    try {
      const updated = await api.updateAppointment(apptId, { status });
      setAppointments(appointments.map((a) => (a.id === apptId ? updated : a)));
    } catch (err) {
      console.error('Failed to update appointment:', err);
    }
  };

  // If status is PENDING, render the exact mandatory clinical hold card
  if (isPending) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="bg-white rounded-2xl border border-amber-200 p-8 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Restricted: Status is PENDING</h2>
          <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto mb-6">
            Awaiting Administrator Verification. In compliance with clinical governance, an authorized hospital administrator must verify your medical license credentials before clinical features are unlocked.
          </p>
          <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-600 text-left space-y-1 mb-6 border border-slate-200">
            <p><strong>Practitioner:</strong> {user.fullName}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Medical License:</strong> {user.licenseNumber || 'Submitted for verification'}</p>
            <p><strong>Specialty:</strong> {user.specialty || 'General Telemedicine'}</p>
          </div>
          <p className="text-xs text-slate-400">
            Once approved by the Administrator via the Governance Portal, clinical dashboards will become immediately accessible.
          </p>
        </div>
      </div>
    );
  }

  const filteredPatients = patients.filter(
    (p) =>
      p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.userId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Video Room Modal if active */}
      {activeVideoSession && (
        <div className="mb-6">
          {!import.meta.env.VITE_VIDEO_CONSULTATION_SERVICE ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Live Video Consultation</h4>
                <p className="text-xs text-slate-500 mt-1">Video consultation service is not configured.</p>
              </div>
              <button
                onClick={() => setActiveVideoSession(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          ) : (
            <VideoConsultationRoom
              patientId={activeVideoSession.patientId}
              patientName={activeVideoSession.patientName}
              doctorId={user.id}
              doctorName={user.fullName}
              userRole="doctor"
              onEndConsultation={() => setActiveVideoSession(null)}
            />
          )}
        </div>
      )}

      {/* Doctor Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-lg border border-blue-200">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{user.fullName}</h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Verified Clinician
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Specialty: {user.specialty || 'General Practitioner'} • Hospital: {user.hospitalAffiliation || 'Metropolitan Hospital'} • NPI: {user.licenseNumber || 'Verified'}
            </p>
          </div>
        </div>

        {selectedPatient && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPrescriptionModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors"
            >
              <Pill className="w-4 h-4" />
              <span>Issue Prescription</span>
            </button>
            <button
              onClick={() =>
                setActiveVideoSession({
                  patientId: selectedPatient.id,
                  patientName: selectedPatient.fullName,
                })
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 transition-colors shadow-xs"
            >
              <Video className="w-4 h-4" />
              <span>Launch Teleconsultation</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Clinical Grid: Left Patient Selector & Right Deep-Dive */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Patient List */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Patient Roster ({patients.length})
            </h3>
            <span className="text-xs text-slate-400">Clinical Cases</span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient name or ID..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {filteredPatients.length === 0 ? (
            <div className="py-12 text-center bg-slate-50 rounded-xl border border-slate-200">
              <User className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No matching patients</p>
              <p className="text-[11px] text-slate-500 mt-1">Patients will appear as they register accounts.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredPatients.map((p) => {
                const isSelected = selectedPatient?.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => selectPatient(p)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900">{p.fullName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {p.gender}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {p.conditions.map((c) => (
                        <span
                          key={c}
                          className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-100 text-teal-800"
                        >
                          {c}
                        </span>
                      ))}
                      {p.conditions.length === 0 && (
                        <span className="text-[10px] text-slate-400 italic">No diagnosed conditions</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 2 Columns: Clinical Deep-Dive */}
        <div className="lg:col-span-2 space-y-6">
          {selectedPatient ? (
            <>
              {/* Patient Banner */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 mb-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <span>{selectedPatient.fullName}</span>
                      <span className="text-xs font-mono text-slate-400">({selectedPatient.userId.slice(0, 8)})</span>
                    </h2>
                    <p className="text-xs text-slate-500">
                      DOB: {selectedPatient.dateOfBirth || 'Unspecified'} • Phone: {selectedPatient.phoneNumber || 'Unspecified'} • Blood: {selectedPatient.bloodGroup || 'Unspecified'}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setInspectorData({
                        title: `FHIR Patient Resource: ${selectedPatient.fullName}`,
                        resourceName: 'Patient',
                        json: buildFHIRPatient(selectedPatient),
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    <FileCode className="w-3.5 h-3.5 text-teal-700" />
                    <span>Inspect FHIR Patient</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 block text-[11px]">Allergies</span>
                    <span className="font-semibold text-slate-900 mt-0.5 block">
                      {selectedPatient.allergies.length > 0 ? selectedPatient.allergies.join(', ') : 'None documented'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 block text-[11px]">Current Medications</span>
                    <span className="font-semibold text-slate-900 mt-0.5 block">
                      {selectedPatient.currentMedications.length > 0 ? selectedPatient.currentMedications.join(', ') : 'None documented'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 block text-[11px]">Emergency Contact</span>
                    <span className="font-semibold text-slate-900 mt-0.5 block">
                      {selectedPatient.emergencyContact?.name || 'None'} ({selectedPatient.emergencyContact?.phone || '-'})
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 block text-[11px]">Total Observations</span>
                    <span className="font-semibold text-teal-700 mt-0.5 block">
                      {readings.length} vitals recorded
                    </span>
                  </div>
                </div>
              </div>

              {/* Sub Navigation */}
              <div className="border-b border-slate-200 flex gap-2 pb-1 overflow-x-auto scrollbar-none">
                {[
                  { id: 'overview', label: 'Vitals & Overview' },
                  { id: 'ai_risk', label: 'AI Risk Stratification' },
                  { id: 'trends', label: 'Health Trends' },
                  { id: 'timeline', label: 'Clinical History' },
                  { id: 'labs', label: `Lab Reports (${labReports.length})` },
                  { id: 'prescriptions', label: `Prescriptions (${prescriptions.length})` },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                      activeTab === t.id
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* TAB 1: Vitals Overview */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Recent Readings Table */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                        Patient Vital Sign Observations
                      </h3>
                      <span className="text-xs text-slate-500">{readings.length} Total</span>
                    </div>

                    {readings.length === 0 ? (
                      <div className="py-10 text-center bg-slate-50 rounded-xl border border-slate-200">
                        <Activity className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-700">No vital sign readings logged yet.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
                            <tr>
                              <th className="py-2.5 px-3">Date/Time</th>
                              <th className="py-2.5 px-3">Parameter</th>
                              <th className="py-2.5 px-3">Value</th>
                              <th className="py-2.5 px-3">Context / Notes</th>
                              <th className="py-2.5 px-3 text-right">FHIR</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {readings.map((r) => (
                              <tr key={r.id} className="hover:bg-slate-50/60">
                                <td className="py-2 px-3 text-slate-500 font-mono">
                                  {r.date} {r.time || ''}
                                </td>
                                <td className="py-2 px-3 font-semibold text-slate-800">
                                  {r.parameterType.replace('_', ' ').toUpperCase()}
                                </td>
                                <td className="py-2 px-3 font-bold text-teal-700">
                                  {r.parameterType === 'blood_pressure'
                                    ? `${r.systolic}/${r.diastolic} mmHg`
                                    : `${r.value} ${r.unit}`}
                                </td>
                                <td className="py-2 px-3 text-slate-600">
                                  {r.measurementContext ? `${r.measurementContext} ` : ''}
                                  {r.notes ? `(${r.notes})` : ''}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  <button
                                    onClick={() =>
                                      setInspectorData({
                                        title: `FHIR Observation: ${r.parameterType}`,
                                        resourceName: 'Observation',
                                        json: buildFHIRObservation(r),
                                      })
                                    }
                                    className="p-1 rounded text-slate-400 hover:text-teal-700 hover:bg-teal-50"
                                  >
                                    <FileCode className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Doctor Appointments for this Patient */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">
                      Telehealth Appointments for this Patient
                    </h3>
                    {appointments.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No scheduled appointments found for this patient.</p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {appointments.map((a) => (
                          <div key={a.id} className="py-3 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-slate-900">{a.reason}</p>
                              <p className="text-[11px] text-slate-500">
                                {new Date(a.dateTime).toLocaleString()} • Status: <strong className="text-slate-700">{a.status}</strong>
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {a.status === 'Proposed' && (
                                <button
                                  onClick={() => handleUpdateAppointment(a.id, 'Booked')}
                                  className="px-2.5 py-1 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg"
                                >
                                  Accept &amp; Book
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  setActiveVideoSession({
                                    patientId: selectedPatient.id,
                                    patientName: selectedPatient.fullName,
                                    apptId: a.id,
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white rounded-lg"
                              >
                                <Video className="w-3 h-3" /> Start Video
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: AI Risk Stratification */}
              {activeTab === 'ai_risk' && (
                <div className="space-y-6">
                  {/* Mandatory Clinical Decision Support Disclaimer */}
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                    <Brain className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-amber-900 mb-0.5">Clinical Decision Support Notice</h4>
                      <p className="leading-relaxed">
                        AI-generated risk assessment for clinical decision support. It is not a diagnosis.
                        Evaluated strictly against published epidemiological models (ADA, AHA/ACC 2017, and GOLD 2024).
                      </p>
                    </div>
                  </div>

                  {/* AI Assessment Controller */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-5">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">Chronic Disease Risk Stratification</h3>
                        <p className="text-xs text-slate-500">
                          Evaluates real vital observations without simulated or random probabilities
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={assessingCondition}
                          onChange={(e: any) => setAssessingCondition(e.target.value)}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="Diabetes">Diabetes (ADA/CDC Model)</option>
                          <option value="Hypertension">Hypertension (AHA/ACC Model)</option>
                          <option value="COPD">COPD (GOLD 2024 Model)</option>
                        </select>

                        <button
                          onClick={handleRunAI}
                          disabled={evaluatingAI}
                          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors disabled:opacity-50"
                        >
                          <Brain className="w-3.5 h-3.5" />
                          <span>{evaluatingAI ? 'Evaluating Model...' : 'Assess Patient Risk'}</span>
                        </button>
                      </div>
                    </div>

                    {/* AI Assessment Result Display */}
                    {currentAIAssessment ? (
                      <div className="space-y-4">
                        {currentAIAssessment.status === 'INSUFFICIENT_DATA' ? (
                          /* Required Insufficient Data state */
                          <div className="p-6 rounded-xl bg-slate-50 border border-slate-200">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertTriangle className="w-5 h-5 text-amber-600" />
                              <h4 className="text-base font-bold text-slate-900">
                                Insufficient data for risk assessment.
                              </h4>
                            </div>
                            <p className="text-xs text-slate-600 mb-4">
                              The AI clinical model requires specific mandatory biomarkers that have not yet been recorded for {selectedPatient.fullName}.
                            </p>

                            <div className="bg-white p-4 rounded-lg border border-slate-200 text-xs mb-3">
                              <span className="font-bold text-slate-800 block mb-1">
                                Missing Required Information:
                              </span>
                              <ul className="list-disc pl-5 space-y-1 text-slate-700">
                                {currentAIAssessment.missingRequiredFields?.map((f, i) => (
                                  <li key={i}>{f}</li>
                                ))}
                              </ul>
                            </div>

                            <div className="text-xs text-slate-500">
                              Model: <span className="font-mono">{currentAIAssessment.modelName} ({currentAIAssessment.modelVersion})</span>
                            </div>
                          </div>
                        ) : (
                          /* Real Assessment Result */
                          <div className="p-6 rounded-xl border-2 border-slate-200 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                              <div>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                                  Condition Evaluated
                                </span>
                                <h4 className="text-lg font-bold text-slate-900">{currentAIAssessment.condition}</h4>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <span className="text-[11px] text-slate-400 block">Risk Category</span>
                                  <span
                                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                      currentAIAssessment.riskLevel === 'HIGH'
                                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                        : currentAIAssessment.riskLevel === 'MODERATE'
                                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    }`}
                                  >
                                    {currentAIAssessment.riskLevel} RISK
                                  </span>
                                </div>
                                <div className="text-right pl-3 border-l border-slate-200">
                                  <span className="text-[11px] text-slate-400 block">Model Confidence</span>
                                  <span className="text-sm font-bold text-slate-900 font-mono">
                                    {Math.round((currentAIAssessment.confidenceScore || 0) * 100)}%
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Clinical Recommendations */}
                            <div>
                              <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                                Clinical Decision Support Insights
                              </h5>
                              <ul className="space-y-1.5">
                                {currentAIAssessment.clinicalRecommendations?.map((rec, i) => (
                                  <li key={i} className="flex items-start text-xs text-slate-700 gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                                    <span>{rec}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Input Features Used */}
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                              <span className="font-bold text-slate-800 block mb-1">
                                Clinical Input Features Ingested:
                              </span>
                              <pre className="font-mono text-[11px] text-slate-600 overflow-x-auto">
                                {JSON.stringify(currentAIAssessment.inputFeaturesUsed, null, 2)}
                              </pre>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                              <span>Model: {currentAIAssessment.modelName} ({currentAIAssessment.modelVersion})</span>
                              <span>Assessed at: {new Date(currentAIAssessment.assessedAt).toLocaleString()}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-12 text-center bg-slate-50 rounded-xl border border-slate-200">
                        <Brain className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-700">No risk assessment evaluated yet for this session.</p>
                        <p className="text-[11px] text-slate-500 mt-1">Select condition and click "Assess Patient Risk".</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: Health Trends */}
              {activeTab === 'trends' && <HealthTrendsView readings={readings} />}

              {/* TAB 4: Timeline */}
              {activeTab === 'timeline' && (
                <LongitudinalHistory
                  conditions={selectedPatient.conditions}
                  readings={readings}
                  labReports={labReports}
                  appointments={appointments}
                  encounters={encounters}
                  prescriptions={prescriptions}
                />
              )}

              {/* TAB 5: Lab Reports */}
              {activeTab === 'labs' && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">
                    Diagnostic Pathology &amp; Lab Reports
                  </h3>
                  {labReports.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No laboratory reports found for this patient.</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {labReports.map((l) => (
                        <div key={l.id} className="py-3 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-slate-900">{l.testName}</p>
                            <p className="text-xs text-slate-600 font-medium">
                              Result: <span className="font-bold text-slate-900">{l.resultValue} {l.unit}</span> (Reference: {l.referenceRange}) • Interpretation: {l.interpretation}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Lab: {l.laboratoryName} • Date: {l.testDate}
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              setInspectorData({
                                title: `FHIR DiagnosticReport: ${l.testName}`,
                                resourceName: 'DiagnosticReport',
                                json: buildFHIRDiagnosticReport(l),
                              })
                            }
                            className="p-1.5 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-teal-50"
                          >
                            <FileCode className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: Prescriptions */}
              {activeTab === 'prescriptions' && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Prescription History
                    </h3>
                    <button
                      onClick={() => setShowPrescriptionModal(true)}
                      className="text-xs font-semibold text-teal-700 hover:underline"
                    >
                      + Write New Prescription
                    </button>
                  </div>

                  {prescriptions.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No active prescriptions for this patient.</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {prescriptions.map((rx) => (
                        <div key={rx.id} className="py-3 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-slate-900">{rx.medication} - {rx.dosage}</p>
                            <p className="text-xs text-slate-600">
                              {rx.frequency} for {rx.duration}. Instructions: {rx.instructions}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Prescribed: {rx.prescribedDate} by Dr. {rx.doctorName}
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              setInspectorData({
                                title: `FHIR MedicationRequest: ${rx.medication}`,
                                resourceName: 'MedicationRequest',
                                json: buildFHIRMedicationRequest(rx),
                              })
                            }
                            className="p-1.5 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-teal-50"
                          >
                            <FileCode className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
              <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">Select a Patient to Begin Clinical Review</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Choose an authorized patient from the left roster to view vital readings, run AI disease risk staging, and conduct teleconsultations.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Write Prescription Modal */}
      {showPrescriptionModal && selectedPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Authorize Medical Prescription</h3>
                <p className="text-xs text-slate-500">Patient: {selectedPatient.fullName}</p>
              </div>
              <button
                onClick={() => setShowPrescriptionModal(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePrescription} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Medication Name</label>
                <input
                  type="text"
                  required
                  value={rxMedication}
                  onChange={(e) => setRxMedication(e.target.value)}
                  placeholder="e.g. Lisinopril / Metformin Hydrochloride"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dosage</label>
                  <input
                    type="text"
                    required
                    value={rxDosage}
                    onChange={(e) => setRxDosage(e.target.value)}
                    placeholder="e.g. 10 mg / 500 mg"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Frequency</label>
                  <input
                    type="text"
                    required
                    value={rxFrequency}
                    onChange={(e) => setRxFrequency(e.target.value)}
                    placeholder="e.g. Once daily after breakfast"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Duration</label>
                <input
                  type="text"
                  required
                  value={rxDuration}
                  onChange={(e) => setRxDuration(e.target.value)}
                  placeholder="e.g. 30 days / 3 months"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Patient Instructions</label>
                <textarea
                  rows={2}
                  value={rxInstructions}
                  onChange={(e) => setRxInstructions(e.target.value)}
                  placeholder="e.g. Take with plenty of water. Avoid skipping doses."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPrescriptionModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRx}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50"
                >
                  {savingRx ? 'Authorizing...' : 'Issue FHIR MedicationRequest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
