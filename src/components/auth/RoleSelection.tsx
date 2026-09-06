import React from 'react';
import { User, Stethoscope, FlaskConical, ShieldCheck, ArrowRight } from 'lucide-react';
import { UserRole } from '../../types';

interface RoleSelectionProps {
  onSelectRole: (role: UserRole) => void;
}

export const RoleSelection: React.FC<RoleSelectionProps> = ({ onSelectRole }) => {
  const roles = [
    {
      id: 'patient' as UserRole,
      title: 'Patient',
      description: 'Access health records',
      icon: User,
    },
    {
      id: 'doctor' as UserRole,
      title: 'Doctor',
      description: 'Manage patient care',
      icon: Stethoscope,
    },
    {
      id: 'laboratory_staff' as UserRole,
      title: 'Laboratory Staff',
      description: 'Manage reports',
      icon: FlaskConical,
    },
    {
      id: 'administrator' as UserRole,
      title: 'Administrator',
      description: 'Manage the platform',
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-xs font-bold tracking-widest text-teal-700 uppercase">
            FHIR TELEHEALTH
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
            Select Your Role
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Choose your role to continue.
          </p>
        </div>

        {/* 4 Clean Role Cards in 2x2 Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <div
                key={role.id}
                onClick={() => onSelectRole(role.id)}
                className="group cursor-pointer bg-white rounded-xl p-6 border border-slate-200 hover:border-teal-600 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center mb-4 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mb-1">
                    {role.title}
                  </h2>
                  <p className="text-sm text-slate-500 mb-6">
                    {role.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectRole(role.id);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold bg-slate-900 text-white group-hover:bg-teal-700 transition-colors"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
