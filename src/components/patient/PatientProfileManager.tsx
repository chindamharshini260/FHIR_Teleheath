import React, { useState } from 'react';
import { PatientProfile } from '../../types';
import { api } from '../../lib/api';
import { User, AlertTriangle, CheckCircle2, Save, Plus, X, HeartPulse } from 'lucide-react';

interface PatientProfileManagerProps {
  profile: PatientProfile;
  onProfileUpdated: (updated: PatientProfile) => void;
  onNavigateToConditions?: () => void;
}

export const PatientProfileManager: React.FC<PatientProfileManagerProps> = ({
  profile,
  onProfileUpdated,
  onNavigateToConditions,
}) => {
  const [fullName, setFullName] = useState(profile.fullName || '');
  const [dob, setDob] = useState(profile.dateOfBirth || '');
  const [gender, setGender] = useState(profile.gender || 'unknown');
  const [phoneNumber, setPhoneNumber] = useState(profile.phoneNumber || '');
  const [bloodGroup, setBloodGroup] = useState(profile.bloodGroup || '');

  // Emergency contact
  const [emerName, setEmerName] = useState(profile.emergencyContact?.name || '');
  const [emerRel, setEmerRel] = useState(profile.emergencyContact?.relationship || '');
  const [emerPhone, setEmerPhone] = useState(profile.emergencyContact?.phone || '');

  // Allergies & Medications
  const [allergies, setAllergies] = useState<string[]>(profile.allergies || []);
  const [newAllergy, setNewAllergy] = useState('');
  const [medications, setMedications] = useState<string[]>(profile.currentMedications || []);
  const [newMed, setNewMed] = useState('');

  // Profile save state
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleAddAllergy = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAllergy.trim() && !allergies.includes(newAllergy.trim())) {
      setAllergies([...allergies, newAllergy.trim()]);
      setNewAllergy('');
    }
  };

  const handleRemoveAllergy = (item: string) => {
    setAllergies(allergies.filter((a) => a !== item));
  };

  const handleAddMed = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMed.trim() && !medications.includes(newMed.trim())) {
      setMedications([...medications, newMed.trim()]);
      setNewMed('');
    }
  };

  const handleRemoveMed = (item: string) => {
    setMedications(medications.filter((m) => m !== item));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const updated = await api.updatePatientProfile(profile.userId, {
        fullName,
        dateOfBirth: dob,
        gender,
        phoneNumber,
        bloodGroup,
        emergencyContact: {
          name: emerName,
          relationship: emerRel,
          phone: emerPhone,
        },
        allergies,
        currentMedications: medications,
      });

      onProfileUpdated(updated);
      setMessage({ text: 'Your health profile has been saved successfully.', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Error updating profile. Please try again.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <form onSubmit={handleSaveProfile} className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 mb-6 gap-3">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">My Health Profile</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Keep your personal and health information up to date.
            </p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold transition-colors disabled:opacity-50 shadow-xs self-start sm:self-auto"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Profile'}</span>
          </button>
        </div>

        {/* Feedback message */}
        {message && (
          <div
            className={`mb-6 p-3.5 rounded-lg text-xs flex items-center gap-2 border ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* 1. Basic Information */}
        <div className="space-y-4 mb-6">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Basic Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="sm:col-span-2 md:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full Name"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none bg-white font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
              <input
                type="date"
                required
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none bg-white font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e: any) => setGender(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none bg-white font-medium text-slate-900"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="unknown">Prefer not to say</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none bg-white font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Group</label>
              <input
                type="text"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                placeholder="e.g. O+, A+, B+"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none bg-white font-medium text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* 2. Emergency Contact */}
        <div className="pt-6 border-t border-slate-100 mb-6 space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Emergency Contact
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Name</label>
              <input
                type="text"
                value={emerName}
                onChange={(e) => setEmerName(e.target.value)}
                placeholder="e.g. Jane Doe"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none bg-white font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Relationship</label>
              <input
                type="text"
                value={emerRel}
                onChange={(e) => setEmerRel(e.target.value)}
                placeholder="e.g. Spouse, Parent, Friend"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none bg-white font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Phone</label>
              <input
                type="tel"
                value={emerPhone}
                onChange={(e) => setEmerPhone(e.target.value)}
                placeholder="+1 (555) 999-9999"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none bg-white font-medium text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* 3. Allergies & Current Medicines */}
        <div className="pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Allergies */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
              Allergies
            </h3>
            <p className="text-xs text-slate-500 mb-2">
              Add any medicines or foods you are allergic to.
            </p>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newAllergy}
                onChange={(e) => setNewAllergy(e.target.value)}
                placeholder="e.g. Penicillin, Peanuts"
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-teal-600 focus:outline-none bg-white font-medium text-slate-900"
              />
              <button
                type="button"
                onClick={handleAddAllergy}
                className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 min-h-[32px] pt-1">
              {allergies.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200"
                >
                  <span>{item}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAllergy(item)}
                    className="p-0.5 rounded-full hover:bg-rose-200 text-rose-700"
                    title={`Remove ${item}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {allergies.length === 0 && (
                <span className="text-xs text-slate-400 italic">No allergies recorded.</span>
              )}
            </div>
          </div>

          {/* Current Medicines */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
              Current Medicines
            </h3>
            <p className="text-xs text-slate-500 mb-2">
              Add medicines you take regularly.
            </p>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newMed}
                onChange={(e) => setNewMed(e.target.value)}
                placeholder="e.g. Metformin 500mg, Lisinopril 10mg"
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-teal-600 focus:outline-none bg-white font-medium text-slate-900"
              />
              <button
                type="button"
                onClick={handleAddMed}
                className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 min-h-[32px] pt-1">
              {medications.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-900 border border-teal-200"
                >
                  <span>{item}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveMed(item)}
                    className="p-0.5 rounded-full hover:bg-teal-200 text-teal-700"
                    title={`Remove ${item}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {medications.length === 0 && (
                <span className="text-xs text-slate-400 italic">No medicines recorded.</span>
              )}
            </div>
          </div>
        </div>

        {/* Quiet navigation link to My Health Conditions */}
        {onNavigateToConditions && (
          <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Looking to update your diagnosed conditions?</span>
            <button
              type="button"
              onClick={onNavigateToConditions}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800"
            >
              <HeartPulse className="w-3.5 h-3.5" />
              <span>Go to My Health Conditions &rarr;</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
