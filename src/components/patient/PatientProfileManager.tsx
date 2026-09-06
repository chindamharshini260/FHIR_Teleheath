import React, { useState } from 'react';
import { PatientProfile, SupportedCondition } from '../../types';
import { api } from '../../lib/api';
import { User, Activity, AlertTriangle, CheckCircle2, Save, Plus, X } from 'lucide-react';

interface PatientProfileManagerProps {
  profile: PatientProfile;
  onProfileUpdated: (updated: PatientProfile) => void;
}

export const PatientProfileManager: React.FC<PatientProfileManagerProps> = ({
  profile,
  onProfileUpdated,
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

  // Medical Conditions
  const [conditions, setConditions] = useState<SupportedCondition[]>(profile.conditions || []);
  const [savingConditions, setSavingConditions] = useState(false);
  const [conditionsMessage, setConditionsMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Profile save state
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const availableConditionOptions: SupportedCondition[] = ['Diabetes', 'Hypertension', 'COPD'];

  const handleSelectCondition = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as SupportedCondition;
    if (val && !conditions.includes(val)) {
      setConditions([...conditions, val]);
      setConditionsMessage(null);
    }
    e.target.value = '';
  };

  const handleRemoveCondition = (conditionToRemove: SupportedCondition) => {
    setConditions(conditions.filter((c) => c !== conditionToRemove));
    setConditionsMessage(null);
  };

  const handleSaveConditions = async () => {
    setSavingConditions(true);
    setConditionsMessage(null);
    try {
      const res = await api.savePatientConditions(profile.userId, conditions);
      onProfileUpdated({ ...profile, conditions: res.conditions });
      setConditionsMessage({
        text: `Medical condition(s) saved: ${res.conditions.join(', ') || 'None'}. Monitoring parameters updated.`,
        type: 'success',
      });
    } catch (err: any) {
      setConditionsMessage({
        text: err.message || 'Failed to save medical conditions.',
        type: 'error',
      });
    } finally {
      setSavingConditions(false);
    }
  };

  const handleAddAllergy = () => {
    if (newAllergy.trim() && !allergies.includes(newAllergy.trim())) {
      setAllergies([...allergies, newAllergy.trim()]);
      setNewAllergy('');
    }
  };

  const handleRemoveAllergy = (item: string) => {
    setAllergies(allergies.filter((a) => a !== item));
  };

  const handleAddMed = () => {
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
      setMessage({ text: 'Patient demographics and medical profile updated successfully.', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Error updating profile.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const availableConditions: { id: SupportedCondition; name: string; desc: string; snomed: string }[] = [
    {
      id: 'Diabetes',
      name: 'Type 1 / Type 2 Diabetes Mellitus',
      desc: 'Enables blood glucose (fasting/post-prandial), HbA1c, and body weight remote surveillance.',
      snomed: 'SNOMED CT: 73211009',
    },
    {
      id: 'Hypertension',
      name: 'Essential Hypertension',
      desc: 'Enables serial blood pressure (systolic & diastolic mmHg) and resting heart rate monitoring.',
      snomed: 'SNOMED CT: 38341003',
    },
    {
      id: 'COPD',
      name: 'Chronic Obstructive Pulmonary Disease',
      desc: 'Enables pulse oximetry (SpO2), respiratory rate, and heart rate dyspnea tracking.',
      snomed: 'SNOMED CT: 13645005',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Medical Conditions Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-600" /> Medical Conditions
            </h3>
            <p className="text-sm font-semibold text-slate-700 mt-1">
              What medical condition do you have?
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Select your condition(s). The system automatically identifies your relevant monitoring parameters.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 self-start">
            Condition-Based Binding
          </span>
        </div>

        {conditionsMessage && (
          <div
            className={`mb-4 p-3 rounded-lg text-xs flex items-center gap-2 ${
              conditionsMessage.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            {conditionsMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{conditionsMessage.text}</span>
          </div>
        )}

        <div className="space-y-4">
          {/* Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Medical Condition(s)
            </label>
            <div className="relative max-w-md">
              <select
                onChange={handleSelectCondition}
                defaultValue=""
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none bg-white font-medium text-slate-800"
              >
                <option value="" disabled>
                  Select condition ▼
                </option>
                {availableConditionOptions.map((cond) => {
                  const isSelected = conditions.includes(cond);
                  return (
                    <option key={cond} value={cond} disabled={isSelected}>
                      {cond} {isSelected ? '(Already added)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Selected Conditions */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Selected Conditions:
            </label>
            {conditions.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-1">
                No conditions selected yet. Choose Diabetes, Hypertension, or COPD from the dropdown.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                {conditions.map((cond) => (
                  <span
                    key={cond}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-teal-50 text-teal-900 border border-teal-200"
                  >
                    <span>{cond}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCondition(cond)}
                      className="p-0.5 rounded-full hover:bg-teal-200 text-teal-700 transition-colors"
                      title={`Remove ${cond}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Save Action */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSaveConditions}
              disabled={savingConditions}
              className="inline-flex items-center justify-center py-2 px-5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {savingConditions ? 'Saving...' : 'Save Conditions'}
            </button>
          </div>
        </div>
      </div>

      {/* Demographics & Clinical Profile Form */}
      <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <User className="w-5 h-5 text-teal-600" /> Patient Demographics &amp; Clinical Baseline
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Demographic records map directly to FHIR Patient resource.
            </p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-teal-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
          </button>
        </div>

        {message && (
          <div
            className={`mb-5 p-3 rounded-lg text-xs flex items-center gap-2 border ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Legal Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
            <input
              type="date"
              required
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
            <select
              value={gender}
              onChange={(e: any) => setGender(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
            <input
              type="tel"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Group</label>
            <input
              type="text"
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              placeholder="e.g. O positive"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="pt-4 border-t border-slate-100 mb-6">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
            Emergency Contact Information
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1">Contact Name</label>
              <input
                type="text"
                value={emerName}
                onChange={(e) => setEmerName(e.target.value)}
                placeholder="Emergency Contact Name"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Relationship</label>
              <input
                type="text"
                value={emerRel}
                onChange={(e) => setEmerRel(e.target.value)}
                placeholder="e.g. Spouse, Sibling"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Emergency Phone</label>
              <input
                type="tel"
                value={emerPhone}
                onChange={(e) => setEmerPhone(e.target.value)}
                placeholder="+1 (555) 999-9999"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Allergies & Current Medications */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Allergies */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Known Allergies</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newAllergy}
                onChange={(e) => setNewAllergy(e.target.value)}
                placeholder="e.g. Penicillin, Peanuts"
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddAllergy}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allergies.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200"
                >
                  {item}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => handleRemoveAllergy(item)} />
                </span>
              ))}
              {allergies.length === 0 && (
                <span className="text-xs text-slate-400 italic">No known allergies documented.</span>
              )}
            </div>
          </div>

          {/* Medications */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Current Regular Medications</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newMed}
                onChange={(e) => setNewMed(e.target.value)}
                placeholder="e.g. Metformin 500mg, Lisinopril 10mg"
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddMed}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {medications.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                >
                  {item}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => handleRemoveMed(item)} />
                </span>
              ))}
              {medications.length === 0 && (
                <span className="text-xs text-slate-400 italic">No medications currently documented.</span>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
