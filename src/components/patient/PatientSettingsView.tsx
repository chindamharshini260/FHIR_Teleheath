import React, { useState } from 'react';
import { UserAccount, PatientProfile } from '../../types';
import { Settings, Bell, Shield, Download, CheckCircle2 } from 'lucide-react';
import { buildFHIRPatient } from '../../lib/fhir';

interface PatientSettingsViewProps {
  user: UserAccount;
  profile: PatientProfile;
}

export const PatientSettingsView: React.FC<PatientSettingsViewProps> = ({ user, profile }) => {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsReminders, setSmsReminders] = useState(true);
  const [readingReminders, setReadingReminders] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleDownloadFHIR = () => {
    const fhirData = buildFHIRPatient(profile);
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fhirData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `fhir-patient-${profile.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Portal Settings</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your communication preferences, security options, and healthcare data export.
        </p>
      </div>

      {/* Communication Preferences */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-5">
          <Bell className="w-4 h-4 text-teal-700" />
          <h3 className="text-sm font-bold text-slate-900">Notifications & Clinical Reminders</h3>
        </div>

        <form onSubmit={handleSavePreferences} className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-slate-50">
            <div>
              <p className="text-xs font-semibold text-slate-900">Appointment Reminders</p>
              <p className="text-[11px] text-slate-500">Receive email notifications for upcoming teleconsultations</p>
            </div>
            <input
              type="checkbox"
              checked={emailNotifications}
              onChange={(e) => setEmailNotifications(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-50">
            <div>
              <p className="text-xs font-semibold text-slate-900">SMS Clinical Alerts</p>
              <p className="text-[11px] text-slate-500">Send urgent updates to your registered phone number</p>
            </div>
            <input
              type="checkbox"
              checked={smsReminders}
              onChange={(e) => setSmsReminders(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-xs font-semibold text-slate-900">Daily Vital Reading Prompt</p>
              <p className="text-[11px] text-slate-500">Notify me to record vitals according to my diagnosed condition</p>
            </div>
            <input
              type="checkbox"
              checked={readingReminders}
              onChange={(e) => setReadingReminders(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
          </div>

          <div className="pt-3 flex items-center justify-between">
            <button
              type="submit"
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              Save Notification Preferences
            </button>
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Preferences saved
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Data Export & Interoperability */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-4">
          <Download className="w-4 h-4 text-teal-700" />
          <h3 className="text-sm font-bold text-slate-900">FHIR R4 Health Record Export</h3>
        </div>
        <p className="text-xs text-slate-600 mb-4">
          You can download a machine-readable, interoperable FHIR R4 Patient resource representing your demographic
          and clinical profile for transfer to any compatible electronic health record (EHR) system.
        </p>
        <button
          onClick={handleDownloadFHIR}
          className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-teal-700" />
          Download FHIR R4 Patient Resource (JSON)
        </button>
      </div>

      {/* Account Security Information */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-4">
          <Shield className="w-4 h-4 text-teal-700" />
          <h3 className="text-sm font-bold text-slate-900">Account Security & Access</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">Authenticated Email</span>
            <span className="font-semibold text-slate-900">{user.email}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">System Identifier</span>
            <span className="font-mono text-slate-700">{user.id}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Account Role</span>
            <span className="font-semibold text-teal-800">Patient</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Security Level</span>
            <span className="text-slate-700 font-medium">Standard Patient Authentication</span>
          </div>
        </div>
      </div>
    </div>
  );
};
