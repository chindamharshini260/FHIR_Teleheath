import React, { useState, useEffect, useMemo } from 'react';
import {
  UserAccount,
  PatientProfile,
  HealthReading,
  SupportedCondition,
  Appointment,
  Prescription,
  LaboratoryReport,
  PatientConsent,
  TeleconsultationEncounter,
  AIRiskAssessment,
} from '../../types';
import { api } from '../../lib/api';
import { buildFHIRPatient, buildFHIRObservation } from '../../lib/fhir';
import { runAIRiskAssessment } from '../../lib/aiRiskEngine';
import {
  Activity,
  Calendar,
  Clock,
  Pill,
  ShieldCheck,
  TrendingUp,
  FileCode,
  User,
  PlusCircle,
  Video,
  LogOut,
  FlaskConical,
  Menu,
  X,
  LayoutDashboard,
  HeartPulse,
  History,
  Settings,
  HelpCircle,
  Bell,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FolderOpen,
} from 'lucide-react';
import { PatientProfileManager } from './PatientProfileManager';
import { MedicalConditionsView } from './MedicalConditionsView';
import { ConditionMonitoringForm } from './ConditionMonitoringForm';
import { HealthTrendsView } from './HealthTrendsView';
import { LongitudinalHistory } from './LongitudinalHistory';
import { PatientAppointments } from './PatientAppointments';
import { PatientPrescriptionsAndLabs } from './PatientPrescriptionsAndLabs';
import { PatientConsentView } from './PatientConsentView';
import { PatientSettingsView } from './PatientSettingsView';
import { PatientHelpSupportView } from './PatientHelpSupportView';
import { VideoConsultationRoom } from '../common/VideoConsultationRoom';
import { FHIRInspectorModal } from '../common/FHIRInspectorModal';
import { TodaysCheckinCard } from './TodaysCheckinCard';

export type PatientNavTab =
  | 'dashboard'
  | 'profile'
  | 'conditions'
  | 'monitoring'
  | 'history'
  | 'trends'
  | 'lab_reports'
  | 'appointments'
  | 'consultations'
  | 'prescriptions'
  | 'consent'
  | 'settings'
  | 'help';

interface PatientDashboardProps {
  user: UserAccount;
  onLogout?: () => void;
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<PatientNavTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [readings, setReadings] = useState<HealthReading[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [labReports, setLabReports] = useState<LaboratoryReport[]>([]);
  const [consent, setConsent] = useState<PatientConsent | null>(null);
  const [encounters, setEncounters] = useState<TeleconsultationEncounter[]>([]);

  const [loading, setLoading] = useState(true);
  const [activeVideoAppt, setActiveVideoAppt] = useState<Appointment | null>(null);
  const [inspectorData, setInspectorData] = useState<{
    title: string;
    resourceName: string;
    json: object;
  } | null>(null);

  useEffect(() => {
    async function fetchPatientData() {
      try {
        const [prof, rds, appts, rxs, labs, cons] = await Promise.all([
          api.getPatientProfile(user.id).catch(() => ({
            id: user.id,
            userId: user.id,
            fullName: user.fullName,
            dateOfBirth: '',
            gender: 'unknown' as const,
            phoneNumber: '',
            emergencyContact: { name: '', relationship: '', phone: '' },
            bloodGroup: '',
            allergies: [],
            currentMedications: [],
            conditions: [] as SupportedCondition[],
            medicalHistoryNotes: '',
            updatedAt: new Date().toISOString(),
          })),
          api.getPatientReadings(user.id),
          api.getAppointments({ patientId: user.id }),
          api.getPrescriptions({ patientId: user.id }),
          api.getLabReports(user.id),
          api.getConsent(user.id),
        ]);

        setProfile(prof);
        setReadings(rds);
        setAppointments(appts);
        setPrescriptions(rxs);
        setLabReports(labs);
        setConsent(cons);
      } catch (err) {
        console.error('Failed to load patient dataset:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPatientData();
  }, [user.id]);

  const handleReadingAdded = (newReading: HealthReading) => {
    setReadings((prev) => [newReading, ...prev]);
  };

  const handleBatchReadingsAdded = (newOrUpdated: HealthReading[]) => {
    setReadings((prev) => {
      const map = new Map<string, HealthReading>(prev.map((r) => [r.id, r]));
      newOrUpdated.forEach((r) => map.set(r.id, r));
      return Array.from(map.values()).sort(
        (a: HealthReading, b: HealthReading) =>
          new Date(`${b.date}T${b.time || '00:00'}`).getTime() -
          new Date(`${a.date}T${a.time || '00:00'}`).getTime()
      );
    });
  };

  const handleConditionsUpdated = (newConditions: SupportedCondition[]) => {
    if (profile) {
      setProfile({
        ...profile,
        conditions: newConditions,
      });
    }
  };

  // Compute deterministic AI Risk Assessment from actual patient data
  const riskAssessments: AIRiskAssessment[] = useMemo(() => {
    if (!profile || !profile.conditions || profile.conditions.length === 0) return [];
    return profile.conditions.map((cond) =>
      runAIRiskAssessment({
        patient: profile,
        readings,
        condition: cond,
      })
    );
  }, [profile, readings]);

  // Primary navigation items in exact specified order
  const primaryNavItems: { id: PatientNavTab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'conditions', label: 'Medical Conditions', icon: HeartPulse },
    { id: 'monitoring', label: 'Health Monitoring', icon: Activity },
    { id: 'history', label: 'Health History', icon: History },
    { id: 'trends', label: 'Health Trends', icon: TrendingUp },
    { id: 'lab_reports', label: 'Laboratory Reports', icon: FlaskConical },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'consultations', label: 'Consultations', icon: Video },
    { id: 'prescriptions', label: 'Prescriptions', icon: Pill },
    { id: 'consent', label: 'Consent Management', icon: ShieldCheck },
  ];

  // Secondary navigation items
  const secondaryNavItems: { id: PatientNavTab; label: string; icon: React.ElementType }[] = [
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help & Support', icon: HelpCircle },
  ];

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-600">Loading Clinical Portal...</p>
        </div>
      </div>
    );
  }

  const formatParamName = (type: string) => {
    switch (type) {
      case 'blood_pressure':
        return 'Blood Pressure';
      case 'blood_glucose':
        return 'Blood Glucose';
      case 'spo2':
        return 'SpO2';
      case 'heart_rate':
        return 'Heart Rate';
      case 'respiratory_rate':
        return 'Respiratory Rate';
      case 'weight':
        return 'Weight';
      case 'hba1c':
        return 'HbA1c';
      default:
        return type.replace('_', ' ');
    }
  };

  const patientDisplayName = profile.fullName || user.fullName;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800 antialiased">
      {/* Mobile Top Navigation Bar */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center text-white">
            <HeartPulse className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-slate-900 text-sm block leading-tight">FHIR Telehealth</span>
            <span className="text-[10px] text-teal-700 font-semibold tracking-wide">Patient Portal</span>
          </div>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Toggle navigation menu"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 md:hidden backdrop-blur-xs"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* PERMANENT LEFT SIDEBAR (Desktop ~256px / Mobile Drawer) */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 md:z-20 h-screen w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out shrink-0 ${
          sidebarOpen ? 'translate-x-0 shadow-xl md:shadow-none' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* 3. SIDEBAR HEADER: Compact Branding */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center shrink-0">
              <HeartPulse className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-sm leading-tight">FHIR Telehealth</h1>
              <p className="text-[10px] text-teal-700 font-semibold tracking-wide uppercase">Patient Portal</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1 rounded-md text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. SIDEBAR NAVIGATION */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {/* Primary Patient Functions */}
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 py-2 text-xs font-medium rounded-lg transition-colors text-left ${
                  isActive
                    ? 'bg-teal-50 text-teal-900 font-semibold border-l-4 border-teal-700 pl-2.5'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 pl-3.5'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-teal-700' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}

          {/* Divider */}
          <div className="pt-2 pb-1">
            <hr className="border-slate-100" />
          </div>

          {/* Secondary Functions */}
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 py-2 text-xs font-medium rounded-lg transition-colors text-left ${
                  isActive
                    ? 'bg-teal-50 text-teal-900 font-semibold border-l-4 border-teal-700 pl-2.5'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 pl-3.5'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-teal-700' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* 4. PATIENT INFORMATION & LOGOUT AT BOTTOM */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50/60 shrink-0">
          <div className="flex items-center gap-2.5 mb-3 px-1">
            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs shrink-0 border border-teal-200">
              {patientDisplayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">{patientDisplayName}</p>
              <p className="text-[10px] text-teal-700 font-semibold truncate">Role: Patient</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* 5. MAIN HEADER */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Welcome back, {patientDisplayName}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage your health information and stay connected with your care team.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Notification Icon */}
              <button
                onClick={() => setActiveTab('appointments')}
                className="relative p-2 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-slate-100 transition-colors"
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {appointments.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-teal-600" />
                )}
              </button>

              {/* Patient Badge */}
              <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
                <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs shrink-0 border border-teal-200">
                  {patientDisplayName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[140px]">
                    {patientDisplayName}
                  </p>
                  <p className="text-[10px] text-teal-700 font-semibold tracking-wide">Patient</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-6 max-w-6xl w-full mx-auto space-y-6 flex-1">
          {/* Active Video Call Modal / Screen if ongoing */}
          {activeVideoAppt && (
            <div className="mb-6">
              <VideoConsultationRoom
                patientId={user.id}
                patientName={patientDisplayName}
                doctorId={activeVideoAppt.doctorId}
                doctorName={activeVideoAppt.doctorName}
                userRole="patient"
                onEndConsultation={() => setActiveVideoAppt(null)}
              />
            </div>
          )}

          {/* ========================================================
              VIEW: DASHBOARD
             ======================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* 1. TODAY'S CHECK-IN */}
              <TodaysCheckinCard
                patientId={user.id}
                conditions={profile.conditions}
                readings={readings}
                onReadingsAdded={handleBatchReadingsAdded}
                onNavigateToConditions={() => setActiveTab('conditions')}
                onInspectFHIR={(r) =>
                  setInspectorData({
                    title: `FHIR Observation: ${r.parameterType}`,
                    resourceName: 'Observation',
                    json: buildFHIRObservation(r),
                  })
                }
              />

              {/* 2. MEDICAL CONDITIONS CARD */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Medical Conditions</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Your monitoring is based on your selected conditions.
                    </p>
                  </div>
                  {(profile?.conditions?.length || 0) > 0 && (
                    <button
                      onClick={() => setActiveTab('conditions')}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 transition-colors"
                    >
                      Manage Conditions &rarr;
                    </button>
                  )}
                </div>

                {(!profile?.conditions || profile.conditions.length === 0) ? (
                  <div className="py-6 px-4 bg-slate-50 border border-slate-200 rounded-lg text-center">
                    <HeartPulse className="w-7 h-7 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700">No medical conditions added yet.</p>
                    <p className="text-[11px] text-slate-500 mt-1 mb-3">
                      Please select your condition(s) to configure clinical vital parameters.
                    </p>
                    <button
                      onClick={() => setActiveTab('conditions')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold transition-colors"
                    >
                      Add Medical Condition
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2.5">
                    {profile.conditions.map((cond) => (
                      <span
                        key={cond}
                        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 text-teal-900 border border-teal-200"
                      >
                        <span className="w-2 h-2 rounded-full bg-teal-600" />
                        <span>{cond}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 7. SUMMARY CARDS (Actual Firestore data counts) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Recent Health Readings */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-medium">Recent Health Readings</span>
                    <Activity className="w-4 h-4 text-teal-700" />
                  </div>
                  <span className="text-2xl font-bold text-slate-900 block">{readings.length}</span>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    {readings.length === 0 ? 'No readings yet' : 'Readings recorded'}
                  </span>
                </div>

                {/* Upcoming Appointments */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-medium">Upcoming Appointments</span>
                    <Calendar className="w-4 h-4 text-teal-700" />
                  </div>
                  <span className="text-2xl font-bold text-slate-900 block">{appointments.length}</span>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    {appointments.length === 0 ? 'No appointments' : 'Upcoming visits'}
                  </span>
                </div>

                {/* Laboratory Reports */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-medium">Laboratory Reports</span>
                    <FlaskConical className="w-4 h-4 text-teal-700" />
                  </div>
                  <span className="text-2xl font-bold text-slate-900 block">{labReports.length}</span>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    {labReports.length === 0 ? 'No reports' : 'Reports available'}
                  </span>
                </div>

                {/* Prescriptions */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-medium">Prescriptions</span>
                    <Pill className="w-4 h-4 text-teal-700" />
                  </div>
                  <span className="text-2xl font-bold text-slate-900 block">{prescriptions.length}</span>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    {prescriptions.length === 0 ? 'No prescriptions' : 'Active prescriptions'}
                  </span>
                </div>
              </div>

              {/* 8. QUICK HEALTH ACTIONS (Your Health Overview) */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3">Your Health Overview</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <button
                    onClick={() => setActiveTab('monitoring')}
                    className="p-4 bg-white rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/20 transition-all text-left shadow-xs group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center mb-2.5 group-hover:bg-teal-700 group-hover:text-white transition-colors">
                      <Activity className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-bold text-slate-900">Add Health Reading</p>
                  </button>

                  <button
                    onClick={() => setActiveTab('history')}
                    className="p-4 bg-white rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/20 transition-all text-left shadow-xs group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center mb-2.5 group-hover:bg-teal-700 group-hover:text-white transition-colors">
                      <History className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-bold text-slate-900">View Health History</p>
                  </button>

                  <button
                    onClick={() => setActiveTab('trends')}
                    className="p-4 bg-white rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/20 transition-all text-left shadow-xs group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center mb-2.5 group-hover:bg-teal-700 group-hover:text-white transition-colors">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-bold text-slate-900">View Health Trends</p>
                  </button>

                  <button
                    onClick={() => setActiveTab('appointments')}
                    className="p-4 bg-white rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/20 transition-all text-left shadow-xs group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center mb-2.5 group-hover:bg-teal-700 group-hover:text-white transition-colors">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-bold text-slate-900">Book Appointment</p>
                  </button>
                </div>
              </div>

              {/* 3. RECENT HEALTH READINGS */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Recent Health Readings</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Actual measurements recorded in Firestore.
                    </p>
                  </div>
                  {readings.length > 0 && (
                    <button
                      onClick={() => setActiveTab('monitoring')}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 transition-colors"
                    >
                      Add Reading &rarr;
                    </button>
                  )}
                </div>

                {readings.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50 rounded-lg border border-slate-100">
                    <Activity className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700">No readings recorded yet.</p>
                    <button
                      onClick={() => setActiveTab('monitoring')}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors"
                    >
                      Add Reading &rarr;
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-medium">
                          <th className="pb-2.5 font-semibold">Parameter</th>
                          <th className="pb-2.5 font-semibold">Value</th>
                          <th className="pb-2.5 font-semibold">Unit</th>
                          <th className="pb-2.5 font-semibold">Date / Time</th>
                          <th className="pb-2.5 font-semibold text-right">FHIR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {readings.slice(0, 5).map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-2.5 font-semibold text-slate-900">
                              {formatParamName(r.parameterType)}
                            </td>
                            <td className="py-2.5 text-slate-800 font-medium">
                              {r.parameterType === 'blood_pressure'
                                ? `${r.systolic}/${r.diastolic}`
                                : r.value}
                              {r.measurementContext && (
                                <span className="ml-1.5 text-[10px] text-slate-400">
                                  ({r.measurementContext})
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 text-slate-500">{r.unit}</td>
                            <td className="py-2.5 text-slate-500">
                              {r.date} {r.time || ''}
                            </td>
                            <td className="py-2.5 text-right">
                              <button
                                onClick={() =>
                                  setInspectorData({
                                    title: `FHIR Observation: ${r.parameterType}`,
                                    resourceName: 'Observation',
                                    json: buildFHIRObservation(r),
                                  })
                                }
                                className="p-1 rounded text-slate-400 hover:text-teal-700 hover:bg-teal-50 transition-colors"
                                title="Inspect FHIR Observation JSON"
                              >
                                <FileCode className="w-3.5 h-3.5 inline" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 4. HEALTH TRENDS */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Health Trends</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Longitudinal vital trends filtered by your diagnosed conditions.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('trends')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 transition-colors"
                  >
                    View Full Trends &rarr;
                  </button>
                </div>

                {readings.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50 rounded-lg border border-slate-100">
                    <TrendingUp className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700">No health readings recorded yet.</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Record your check-in readings above to generate continuous visual health trends.
                    </p>
                  </div>
                ) : (
                  <HealthTrendsView
                    readings={readings}
                    conditions={profile.conditions}
                    onNavigateToConditions={() => setActiveTab('conditions')}
                  />
                )}
              </div>

              {/* 5. AI RISK ASSESSMENT */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                <div className="pb-3 border-b border-slate-100 mb-4">
                  <h3 className="text-sm font-bold text-slate-900">AI Risk Assessment</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    AI-assisted risk stratification based on available health data.
                  </p>
                </div>

                {/* Check if AI is configured */}
                {!import.meta.env.VITE_AI_SERVICE_URL ? (
                  <div className="py-6 text-center bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-xs font-semibold text-slate-700">AI risk assessment service is not configured.</p>
                  </div>
                ) : (!profile?.conditions || profile.conditions.length === 0) ? (
                  <div className="py-6 text-center bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-xs font-semibold text-slate-700">No medical conditions added yet.</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Select your diagnosed condition in Medical Conditions to enable risk stratification.
                    </p>
                  </div>
                ) : riskAssessments.length === 0 ? (
                  <div className="py-6 text-center bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-xs font-semibold text-slate-700">No risk assessment available.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {riskAssessments.map((assessment) => {
                      const isAssessed = assessment.status === 'ASSESSED';
                      const level = assessment.riskLevel;

                      return (
                        <div
                          key={assessment.id}
                          className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <span className="text-xs font-bold text-slate-900">
                                Condition: {assessment.condition}
                              </span>
                              <span className="text-[10px] text-slate-400 block sm:inline sm:ml-2">
                                Model: {assessment.modelName}
                              </span>
                            </div>

                            {isAssessed && level ? (
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                                  level === 'HIGH'
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : level === 'MODERATE'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-teal-100 text-teal-800 border border-teal-200'
                                }`}
                              >
                                Risk Level: {level}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                Insufficient data
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-600">
                            {isAssessed
                              ? assessment.message
                              : 'Insufficient data for risk assessment.'}
                          </p>

                          {!isAssessed && assessment.missingRequiredFields && (
                            <div className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                              <span className="font-semibold block mb-0.5">Required data to evaluate:</span>
                              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                                {assessment.missingRequiredFields.map((field, idx) => (
                                  <li key={idx}>{field}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-400 gap-1">
                            <span>
                              AI-generated risk assessment for clinical decision support. It is not a diagnosis.
                            </span>
                            <span>{new Date(assessment.assessedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 6 & 7. TWO-COLUMN: UPCOMING APPOINTMENTS & LATEST LABORATORY REPORT */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 6. Upcoming Appointments */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                    <h3 className="text-sm font-bold text-slate-900">Upcoming Appointments</h3>
                    <button
                      onClick={() => setActiveTab('appointments')}
                      className="text-xs font-semibold text-teal-700 hover:text-teal-800"
                    >
                      Book Appointment &rarr;
                    </button>
                  </div>

                  {appointments.length === 0 ? (
                    <div className="py-8 text-center bg-slate-50 rounded-lg border border-slate-100 my-auto">
                      <Calendar className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
                      <p className="text-xs font-semibold text-slate-700">No upcoming appointments.</p>
                      <button
                        onClick={() => setActiveTab('appointments')}
                        className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-teal-800 hover:underline"
                      >
                        Book Appointment &rarr;
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {appointments.slice(0, 2).map((appt) => (
                        <div key={appt.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-900">Dr. {appt.doctorName}</h4>
                            <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                              {appt.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-1">
                            {new Date(appt.dateTime).toLocaleString()} • {appt.reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 7. Latest Laboratory Report */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                    <h3 className="text-sm font-bold text-slate-900">Latest Laboratory Report</h3>
                    <button
                      onClick={() => setActiveTab('lab_reports')}
                      className="text-xs font-semibold text-teal-700 hover:text-teal-800"
                    >
                      View All &rarr;
                    </button>
                  </div>

                  {labReports.length === 0 ? (
                    <div className="py-8 text-center bg-slate-50 rounded-lg border border-slate-100 my-auto">
                      <FlaskConical className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
                      <p className="text-xs font-semibold text-slate-700">No laboratory reports available.</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Diagnostic results will appear once uploaded by the lab.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {labReports.slice(0, 1).map((rep) => (
                        <div key={rep.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-900">{rep.testName}</h4>
                            <span className="text-[10px] text-slate-500">{rep.issuedDate}</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">Status: {rep.status}</p>
                          {rep.clinicalNotes && (
                            <p className="text-[11px] text-slate-500 mt-1 italic line-clamp-2">
                              {rep.clinicalNotes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: PROFILE */}
          {activeTab === 'profile' && (
            <PatientProfileManager profile={profile} onProfileUpdated={(up) => setProfile(up)} />
          )}

          {/* VIEW: MEDICAL CONDITIONS */}
          {activeTab === 'conditions' && (
            <MedicalConditionsView
              profile={profile}
              onConditionsUpdated={handleConditionsUpdated}
              onNavigateToMonitoring={() => setActiveTab('monitoring')}
            />
          )}

          {/* VIEW: HEALTH MONITORING (Condition-Based Vital Entry) */}
          {activeTab === 'monitoring' && (
            <div className="space-y-6">
              <ConditionMonitoringForm
                patientId={user.id}
                conditions={profile.conditions}
                readings={readings}
                onReadingAdded={handleReadingAdded}
                onNavigateToConditions={() => setActiveTab('conditions')}
              />
            </div>
          )}

          {/* VIEW: HEALTH HISTORY (Longitudinal Timeline) */}
          {activeTab === 'history' && (
            <LongitudinalHistory
              conditions={profile.conditions}
              readings={readings}
              labReports={labReports}
              appointments={appointments}
              encounters={encounters}
              prescriptions={prescriptions}
            />
          )}

          {/* VIEW: HEALTH TRENDS */}
          {activeTab === 'trends' && (
            <HealthTrendsView
              readings={readings}
              conditions={profile.conditions}
              onNavigateToConditions={() => setActiveTab('conditions')}
            />
          )}

          {/* VIEW: LAB REPORTS */}
          {activeTab === 'lab_reports' && (
            <PatientPrescriptionsAndLabs
              prescriptions={prescriptions}
              labReports={labReports}
              initialTab="labs"
            />
          )}

          {/* VIEW: APPOINTMENTS */}
          {activeTab === 'appointments' && (
            <PatientAppointments
              patientId={user.id}
              patientName={patientDisplayName}
              onJoinVideo={(appt) => setActiveVideoAppt(appt)}
            />
          )}

          {/* VIEW: CONSULTATIONS */}
          {activeTab === 'consultations' && (
            <PatientAppointments
              patientId={user.id}
              patientName={patientDisplayName}
              onJoinVideo={(appt) => setActiveVideoAppt(appt)}
            />
          )}

          {/* VIEW: PRESCRIPTIONS */}
          {activeTab === 'prescriptions' && (
            <PatientPrescriptionsAndLabs
              prescriptions={prescriptions}
              labReports={labReports}
              initialTab="prescriptions"
            />
          )}

          {/* VIEW: CONSENT */}
          {activeTab === 'consent' && (
            <PatientConsentView
              patientId={user.id}
              consent={consent}
              onConsentUpdated={(up) => setConsent(up)}
            />
          )}

          {/* VIEW: SETTINGS */}
          {activeTab === 'settings' && (
            <PatientSettingsView user={user} profile={profile} />
          )}

          {/* VIEW: HELP & SUPPORT */}
          {activeTab === 'help' && <PatientHelpSupportView />}
        </div>
      </main>

      {/* FHIR Inspector Modal */}
      {inspectorData && (
        <FHIRInspectorModal
          title={inspectorData.title}
          resourceName={inspectorData.resourceName}
          fhirJson={inspectorData.json}
          onClose={() => setInspectorData(null)}
        />
      )}

      {/* Video Consultation Modal */}
      {activeVideoAppt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-xl">
            <h3 className="text-base font-bold text-slate-900 mb-2">Video Consultation</h3>
            <p className="text-xs text-slate-600 mb-6">Video consultation service is not configured.</p>
            <div className="flex justify-end">
              <button
                onClick={() => setActiveVideoAppt(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
