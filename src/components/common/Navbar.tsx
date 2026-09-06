import React from 'react';
import { Activity, LogOut, ShieldCheck, UserCheck, Stethoscope, FlaskConical } from 'lucide-react';
import { UserAccount } from '../../types';

interface NavbarProps {
  currentUser: UserAccount | null;
  onLogout: () => void;
  onSwitchRole: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentUser, onLogout, onSwitchRole }) => {
  const getRoleBadge = (role: string, doctorStatus?: string) => {
    switch (role) {
      case 'patient':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <UserCheck className="w-3.5 h-3.5" /> Patient
          </span>
        );
      case 'doctor':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Stethoscope className="w-3.5 h-3.5" /> Doctor {doctorStatus ? `(${doctorStatus})` : ''}
          </span>
        );
      case 'laboratory_staff':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
            <FlaskConical className="w-3.5 h-3.5" /> Laboratory Staff
          </span>
        );
      case 'administrator':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <ShieldCheck className="w-3.5 h-3.5" /> Administrator
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo / Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-cyan-600 flex items-center justify-center text-white shadow-sm">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 tracking-tight text-lg">FHIR Telehealth</span>
                <span className="text-[11px] font-semibold bg-teal-100 text-teal-800 px-2 py-0.5 rounded">R4 Interoperable</span>
              </div>
              <p className="text-xs text-slate-500">Remote Vital Monitoring &amp; AI Risk Stratification</p>
            </div>
          </div>

          {/* User Status / Actions */}
          <div className="flex items-center gap-4">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium text-slate-900">{currentUser.fullName}</div>
                  <div className="text-xs text-slate-500">{currentUser.email}</div>
                </div>
                {getRoleBadge(currentUser.role, currentUser.doctorStatus)}
                <button
                  onClick={onLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onSwitchRole}
                className="text-xs font-medium text-teal-700 hover:text-teal-800 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200 transition-colors"
              >
                Select Role
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
