import React, { useState, useEffect } from 'react';
import { UserAccount, AuditEventRecord } from '../../types';
import { api } from '../../lib/api';
import { buildFHIRAuditEvent } from '../../lib/fhir';
import {
  ShieldAlert,
  UserCheck,
  UserX,
  Users,
  Activity,
  FileCode,
  CheckCircle2,
  Clock,
  Server,
  Building,
  RefreshCw,
  Search,
} from 'lucide-react';
import { FHIRInspectorModal } from '../common/FHIRInspectorModal';

interface AdminDashboardProps {
  user: UserAccount;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'verification' | 'users' | 'audit' | 'system'>('verification');
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Inspector modal
  const [inspectorData, setInspectorData] = useState<{ title: string; resourceName: string; json: object } | null>(null);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [allUsers, audits] = await Promise.all([api.getAllUsers(), api.getAuditEvents()]);
      setUsers(allUsers);
      setAuditLogs(audits);
    } catch (err) {
      console.error('Failed to load admin dataset:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDoctor = async (doctorId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.verifyDoctor(doctorId, status, user.id);
      setActionMessage(`Doctor credentials updated to ${status}.`);
      // Reload users and audit
      loadAdminData();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setActionMessage(`Failed to update verification: ${err.message}`);
    }
  };

  const doctors = users.filter((u) => u.role === 'doctor');
  const pendingDoctors = doctors.filter((d) => d.doctorStatus === 'PENDING');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg">
            <ShieldAlert className="w-6 h-6 text-teal-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">Hospital Governance Portal</h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                Administrator
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Clinician credential verification, user access control, and FHIR AuditEvent provenance.
            </p>
          </div>
        </div>

        <button
          onClick={loadAdminData}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Records</span>
        </button>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-2 pb-1 overflow-x-auto scrollbar-none">
        {[
          { id: 'verification', label: `Doctor Verification Queue (${pendingDoctors.length})` },
          { id: 'users', label: `System Users (${users.length})` },
          { id: 'audit', label: `FHIR Audit Trail (${auditLogs.length})` },
          { id: 'system', label: 'Platform & FHIR Health' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === t.id
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Doctor Verification Queue */}
      {activeTab === 'verification' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Physician Credentials Verification
              </h3>
              <p className="text-xs text-slate-500">
                Doctors registered with status = PENDING require administrator approval before clinical dashboard access is granted.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              {pendingDoctors.length} Awaiting Review
            </span>
          </div>

          {doctors.length === 0 ? (
            <div className="py-16 text-center bg-slate-50 rounded-xl border border-slate-200">
              <Users className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No doctors currently registered</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Physician Name</th>
                    <th className="py-3 px-4">License / NPI</th>
                    <th className="py-3 px-4">Specialty</th>
                    <th className="py-3 px-4">Affiliation</th>
                    <th className="py-3 px-4">Verification Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {doctors.map((doc) => {
                    const isDocPending = doc.doctorStatus === 'PENDING';
                    const isApproved = doc.doctorStatus === 'APPROVED';
                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{doc.fullName}</span>
                          <span className="text-[11px] text-slate-500">{doc.email}</span>
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-700">
                          {doc.licenseNumber || 'Not provided'}
                        </td>
                        <td className="py-3 px-4 text-slate-700">{doc.specialty || 'General Practice'}</td>
                        <td className="py-3 px-4 text-slate-700">{doc.hospitalAffiliation || 'Metropolitan Hospital'}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              isApproved
                                ? 'bg-emerald-100 text-emerald-800'
                                : doc.doctorStatus === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800 animate-pulse'
                            }`}
                          >
                            {doc.doctorStatus || 'PENDING'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          {isDocPending ? (
                            <>
                              <button
                                onClick={() => handleVerifyDoctor(doc.id, 'APPROVED')}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleVerifyDoctor(doc.id, 'REJECTED')}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                              >
                                <UserX className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </>
                          ) : isApproved ? (
                            <button
                              onClick={() => handleVerifyDoctor(doc.id, 'REJECTED')}
                              className="px-2.5 py-1 text-[11px] text-rose-600 hover:underline"
                            >
                              Revoke Approval
                            </button>
                          ) : (
                            <button
                              onClick={() => handleVerifyDoctor(doc.id, 'APPROVED')}
                              className="px-2.5 py-1 text-[11px] text-emerald-700 font-semibold hover:underline"
                            >
                              Re-Approve
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: System Users */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              All Registered Healthcare Accounts ({users.length})
            </h3>
            <span className="text-xs text-slate-400">Strict RBAC Enforced</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Identifier</th>
                  <th className="py-2.5 px-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{u.fullName}</td>
                    <td className="py-2.5 px-3 text-slate-600">{u.email}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-slate-100 text-slate-700">
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">{u.id}</td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: FHIR Audit Trail */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                FHIR AuditEvent Provenance Trail
              </h3>
              <p className="text-xs text-slate-500">Immutable clinical audit logs tracking data access and updates</p>
            </div>
            <span className="text-xs font-mono text-slate-400">HL7 FHIR AuditEvent (R4)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Resource</th>
                  <th className="py-2.5 px-3">Initiated By</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-right">FHIR JSON</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-slate-800 font-mono text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-teal-700">{log.resourceType}</td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {log.userEmail} ({log.userRole})
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 max-w-xs truncate">{log.description}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() =>
                          setInspectorData({
                            title: `FHIR AuditEvent: ${log.action}`,
                            resourceName: 'AuditEvent',
                            json: buildFHIRAuditEvent(log),
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
        </div>
      )}

      {/* TAB 4: Platform & FHIR Health */}
      {activeTab === 'system' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-teal-600 font-bold text-sm">
              <Server className="w-5 h-5" />
              <span>FHIR R4 Server</span>
            </div>
            <p className="text-xs text-slate-600">
              CapabilityStatement conforms to Release 4.0.1. REST interactions enabled for Patient, Observation, Condition, DiagnosticReport, Appointment, MedicationRequest, and AuditEvent.
            </p>
            <div className="pt-2 text-xs font-mono text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Status: Online &amp; Conforming
            </div>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
              <Activity className="w-5 h-5" />
              <span>AI Risk Engine</span>
            </div>
            <p className="text-xs text-slate-600">
              Deterministic clinical risk scoring engine for Diabetes (ADA), Hypertension (AHA/ACC 2017), and COPD (GOLD 2024). ZERO random prediction policy enforced.
            </p>
            <div className="pt-2 text-xs font-mono text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Status: Active (3 Clinical Models)
            </div>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-purple-600 font-bold text-sm">
              <Building className="w-5 h-5" />
              <span>Healthcare Facility</span>
            </div>
            <p className="text-xs text-slate-600">
              Metropolitan Telehealth &amp; Research Hospital (org-metro-health). National Clinical Pathology &amp; Diagnostic Lab (org-central-lab).
            </p>
            <div className="pt-2 text-xs font-mono text-slate-500">
              Licensed Institutional Provider
            </div>
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
