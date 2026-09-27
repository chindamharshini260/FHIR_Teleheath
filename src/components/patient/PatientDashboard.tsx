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
import { runAIRiskAssessment } from '../../lib/aiRiskEngine';
import {
  Activity,
  Calendar,
  Clock,
  Pill,
  ShieldCheck,
  TrendingUp,
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
  Sparkles,
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

export type PatientNavTab =
  | 'dashboard'
  | 'profile'
  | 'conditions'
  | 'monitoring'
  | 'history'
  | 'trends'
  | 'ai_risk'
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
        setReadings(rds || []);
        setAppointments(appts || []);
        setPrescriptions(rxs || []);
        setLabReports(labs || []);
        setConsent(cons || null);
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

  const handleConditionsUpdated = (newConditions: SupportedCondition[]) => {
    if (profile) {
      setProfile({
        ...profile,
        conditions: newConditions,
      });
    }
  };

  // Deterministic AI Risk Assessments for selected conditions
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

  // Next upcoming appointment
  const nextAppointment = useMemo(() => {
    const upcoming = appointments
      .filter((a) => a.status === 'Booked' || a.status === 'Proposed')
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
    return upcoming[0] || null;
  }, [appointments]);

  // Latest Health Reading Summary
  const latestReadingSummary = useMemo(() => {
    if (readings.length === 0) return null;
    const sorted = [...readings].sort(
      (a, b) =>
        new Date(`${b.date}T${b.time || '00:00'}`).getTime() -
        new Date(`${a.date}T${a.time || '00:00'}`).getTime()
    );

    const bp = sorted.find((r) => r.parameterType === 'blood_pressure');
    const hr = sorted.find((r) => r.parameterType === 'heart_rate');
    const bg = sorted.find((r) => r.parameterType === 'blood_glucose');
    const spo2 = sorted.find((r) => r.parameterType === 'spo2');

    const lines: string[] = [];
    if (bp && bp.systolic && bp.diastolic) {
      lines.push(`Blood Pressure: ${bp.systolic}/${bp.diastolic}`);
    }
    if (hr && hr.value) {
      lines.push(`Heart Rate: ${hr.value} bpm`);
    }
    if (bg && bg.value && lines.length < 2) {
      lines.push(`Blood Glucose: ${bg.value} mg/dL`);
    }
    if (spo2 && spo2.value && lines.length < 2) {
      lines.push(`SpO2: ${spo2.value}%`);
    }

    if (lines.length === 0) {
      const top = sorted[0];
      lines.push(`${top.parameterType.replace('_', ' ')}: ${top.value ?? ''} ${top.unit}`);
    }

    return lines;
  }, [readings]);

  // Navigation Items
  const primaryNavItems: { id: PatientNavTab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'conditions', label: 'My Health Conditions', icon: HeartPulse },
    { id: 'monitoring', label: 'Health Monitoring', icon: Activity },
    { id: 'history', label: 'Health History', icon: History },
    { id: 'trends', label: 'Health Trends', icon: TrendingUp },
    { id: 'ai_risk', label: 'Health Risk Assessment', icon: Sparkles },
    { id: 'lab_reports', label: 'Laboratory Reports', icon: FlaskConical },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'consultations', label: 'Consultations', icon: Video },
    { id: 'prescriptions', label: 'Prescriptions', icon: Pill },
    { id: 'consent', label: 'Privacy & Consent', icon: ShieldCheck },
  ];

  const secondaryNavItems: { id: PatientNavTab; label: string; icon: React.ElementType }[] = [
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help & Support', icon: HelpCircle },
  ];

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-600">Loading Portal...</p>
        </div>
      </div>
    );
  }

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

      {/* PERMANENT LEFT SIDEBAR */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 md:z-20 h-screen w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out shrink-0 ${
          sidebarOpen ? 'translate-x-0 shadow-xl md:shadow-none' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Sidebar Header */}
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

        {/* Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
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

          <div className="pt-2 pb-1">
            <hr className="border-slate-100" />
          </div>

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

        {/* Patient Profile & Logout */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50/60 shrink-0">
          <div className="flex items-center gap-2.5 mb-3 px-1">
            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs shrink-0 border border-teal-200">
              {patientDisplayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">{patientDisplayName}</p>
              <p className="text-[10px] text-teal-700 font-semibold truncate">Patient</p>
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
        {/* Main Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Welcome back, {patientDisplayName}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage your health information and stay connected with your care team.
              </p>
            </div>

            <div className="flex items-center gap-3">
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
        <div className="p-6 max-w-5xl w-full mx-auto space-y-6 flex-1">
          {/* Active Video Call Screen if ongoing */}
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
              VIEW: DASHBOARD (Clean, 4 Cards, Quick Actions)
             ======================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* 4 Simple Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. My Condition */}
                <div
                  onClick={() => setActiveTab('conditions')}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:border-teal-500 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      My Condition
                    </span>
                    <HeartPulse className="w-4 h-4 text-teal-700" />
                  </div>

                  <div className="my-1">
                    {profile.conditions && profile.conditions.length > 0 ? (
                      <p className="text-base font-bold text-slate-900 leading-snug">
                        {profile.conditions.join(', ')}
                      </p>
                    ) : (
                      <p className="text-sm font-semibold text-slate-400">None selected</p>
                    )}
                  </div>

                  <span className="text-[11px] text-teal-700 font-semibold mt-2 inline-flex items-center gap-1">
                    Manage conditions &rarr;
                  </span>
                </div>

                {/* 2. Latest Health Reading */}
                <div
                  onClick={() => setActiveTab('monitoring')}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:border-teal-500 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Latest Health Reading
                    </span>
                    <Activity className="w-4 h-4 text-teal-700" />
                  </div>

                  <div className="my-1">
                    {latestReadingSummary ? (
                      <div className="space-y-0.5">
                        {latestReadingSummary.map((line, idx) => (
                          <p key={idx} className="text-xs font-bold text-slate-800">
                            {line}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs font-semibold text-slate-400">No readings yet</p>
                    )}
                  </div>

                  <span className="text-[11px] text-teal-700 font-semibold mt-2 inline-flex items-center gap-1">
                    Enter health reading &rarr;
                  </span>
                </div>

                {/* 3. Upcoming Appointment */}
                <div
                  onClick={() => setActiveTab('appointments')}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:border-teal-500 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Upcoming Appointment
                    </span>
                    <Calendar className="w-4 h-4 text-teal-700" />
                  </div>

                  <div className="my-1">
                    {nextAppointment ? (
                      <div>
                        <p className="text-xs font-bold text-slate-900 truncate">
                          Dr. {nextAppointment.doctorName}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {new Date(nextAppointment.dateTime).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs font-semibold text-slate-400">No upcoming appointments</p>
                    )}
                  </div>

                  <span className="text-[11px] text-teal-700 font-semibold mt-2 inline-flex items-center gap-1">
                    Book appointment &rarr;
                  </span>
                </div>

                {/* 4. Laboratory Reports */}
                <div
                  onClick={() => setActiveTab('lab_reports')}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:border-teal-500 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Laboratory Reports
                    </span>
                    <FlaskConical className="w-4 h-4 text-teal-700" />
                  </div>

                  <div className="my-1">
                    <p className="text-xl font-bold text-slate-900">
                      {labReports.length} {labReports.length === 1 ? 'report' : 'reports'}
                    </p>
                  </div>

                  <span className="text-[11px] text-teal-700 font-semibold mt-2 inline-flex items-center gap-1">
                    View reports &rarr;
                  </span>
                </div>
              </div>

              {/* Quick Actions (Simple, minimal, whitespace) */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-4">
                  Quick Actions
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => setActiveTab('monitoring')}
                    className="p-4 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/20 transition-all text-left group flex items-center gap-3"
                  >
                    <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center group-hover:bg-teal-700 group-hover:text-white transition-colors shrink-0">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Enter Health Reading</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Record your latest vitals</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab('history')}
                    className="p-4 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/20 transition-all text-left group flex items-center gap-3"
                  >
                    <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center group-hover:bg-teal-700 group-hover:text-white transition-colors shrink-0">
                      <History className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">View Health History</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Review previous readings</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab('appointments')}
                    className="p-4 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/20 transition-all text-left group flex items-center gap-3"
                  >
                    <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center group-hover:bg-teal-700 group-hover:text-white transition-colors shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Book Appointment</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Schedule a visit with a doctor</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: PROFILE */}
          {activeTab === 'profile' && (
            <PatientProfileManager
              profile={profile}
              onProfileUpdated={(up) => setProfile(up)}
              onNavigateToConditions={() => setActiveTab('conditions')}
            />
          )}

          {/* VIEW: MEDICAL CONDITIONS */}
          {activeTab === 'conditions' && (
            <MedicalConditionsView
              profile={profile}
              onConditionsUpdated={handleConditionsUpdated}
              onNavigateToMonitoring={() => setActiveTab('monitoring')}
            />
          )}

          {/* VIEW: HEALTH MONITORING */}
          {activeTab === 'monitoring' && (
            <ConditionMonitoringForm
              patientId={user.id}
              conditions={profile.conditions}
              readings={readings}
              onReadingAdded={handleReadingAdded}
              onNavigateToConditions={() => setActiveTab('conditions')}
            />
          )}

          {/* VIEW: HEALTH HISTORY */}
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

          {/* VIEW: HEALTH RISK ASSESSMENT */}
          {activeTab === 'ai_risk' && (
            <div className="max-w-3xl space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                <div className="pb-5 border-b border-slate-100">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Health Risk Assessment</h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Review your health risk based on your available health information.
                  </p>
                  <div className="mt-3 p-3 rounded-lg bg-teal-50/70 border border-teal-200 text-xs text-teal-900">
                    <p className="font-medium">
                      This information is for support and does not replace advice from your doctor.
                    </p>
                  </div>
                </div>

                <div className="pt-5 space-y-4">
                  {(!profile.conditions || profile.conditions.length === 0) ? (
                    <div className="py-10 text-center bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-xs font-semibold text-slate-700">No health condition selected yet.</p>
                      <button
                        onClick={() => setActiveTab('conditions')}
                        className="mt-3 px-4 py-2 bg-teal-700 text-white rounded-lg text-xs font-semibold hover:bg-teal-800 transition-colors shadow-xs"
                      >
                        Select Health Conditions
                      </button>
                    </div>
                  ) : (
                    riskAssessments.map((assessment) => {
                      const isAssessed = assessment.status === 'ASSESSED';
                      const level = assessment.riskLevel;

                      return (
                        <div
                          key={assessment.id}
                          className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5 shadow-2xs"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <span className="text-sm font-bold text-slate-900">
                              Condition: {assessment.condition}
                            </span>

                            {isAssessed && level ? (
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                                  level === 'HIGH'
                                    ? 'bg-rose-100 text-rose-800'
                                    : level === 'MODERATE'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-teal-100 text-teal-800'
                                }`}
                              >
                                Risk Level: {level}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                                Insufficient data
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed">
                            {assessment.message}
                          </p>

                          {!isAssessed && assessment.missingRequiredFields && (
                            <div className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                              <span className="font-semibold block mb-0.5">Required measurements to evaluate:</span>
                              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                                {assessment.missingRequiredFields.map((field, idx) => (
                                  <li key={idx}>{field}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
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
              mode="appointments"
            />
          )}

          {/* VIEW: CONSULTATIONS */}
          {activeTab === 'consultations' && (
            <PatientAppointments
              patientId={user.id}
              patientName={patientDisplayName}
              onJoinVideo={(appt) => setActiveVideoAppt(appt)}
              mode="consultations"
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
