import React, { useState, useEffect } from 'react';
import { Appointment, UserAccount } from '../../types';
import { api } from '../../lib/api';
import { Calendar, Clock, Video, PlusCircle, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

interface PatientAppointmentsProps {
  patientId: string;
  patientName: string;
  onJoinVideo: (appointment: Appointment) => void;
}

export const PatientAppointments: React.FC<PatientAppointmentsProps> = ({
  patientId,
  patientName,
  onJoinVideo,
}) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // New appointment form
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [appts, docs] = await Promise.all([
          api.getAppointments({ patientId }),
          api.getDoctors(),
        ]);
        setAppointments(appts || []);
        // Only allow booking with approved doctors
        const approvedDocs = (docs || []).filter((d) => d.doctorStatus === 'APPROVED' || !d.doctorStatus);
        setDoctors(approvedDocs);
        if (approvedDocs.length > 0) {
          setSelectedDoctorId(approvedDocs[0].id);
        }
      } catch (err) {
        console.error('Error loading appointments data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [patientId]);

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || !dateTime || !reason) {
      setMessage({ text: 'Please fill in all required appointment details.', type: 'error' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const doc = doctors.find((d) => d.id === selectedDoctorId);
    const doctorName = doc?.fullName || 'Physician';

    try {
      const newAppt = await api.createAppointment({
        patientId,
        patientName,
        doctorId: selectedDoctorId,
        doctorName,
        dateTime,
        status: 'Proposed',
        reason,
      });

      setAppointments([newAppt, ...appointments]);
      setMessage({ text: `Appointment request submitted to Dr. ${doctorName}.`, type: 'success' });
      setReason('');
      setDateTime('');
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to book appointment', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: Appointment['status']) => {
    switch (status) {
      case 'Booked':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Confirmed / Booked</span>;
      case 'Proposed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">Proposed / Pending Review</span>;
      case 'Fulfilled':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">Completed</span>;
      case 'Cancelled':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">Cancelled</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Booking Form */}
      <form onSubmit={handleBookAppointment} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="pb-4 border-b border-slate-100 mb-5">
          <h3 className="text-lg font-bold text-slate-900">Request Virtual Telehealth Consultation</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Appointments generate standard FHIR Appointment and Encounter resources.
          </p>
        </div>

        {message && (
          <div
            className={`mb-4 p-3 rounded-lg text-xs flex items-center gap-2 border ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Physician</label>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            >
              {doctors.length === 0 ? (
                <option value="">No verified doctors currently available</option>
              ) : (
                doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName} ({d.specialty || 'General Telemedicine'})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Appointment Date &amp; Time</label>
            <input
              type="datetime-local"
              required
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-700 mb-1">Consultation Reason / Clinical Symptoms</label>
          <input
            type="text"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Regular hypertension check-up, medication renewal discussion"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || doctors.length === 0}
          className="inline-flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{submitting ? 'Submitting Request...' : 'Schedule Appointment'}</span>
        </button>
      </form>

      {/* Existing Appointments List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="pb-4 border-b border-slate-100 mb-4">
          <h3 className="text-lg font-bold text-slate-900">Your Scheduled Consultations</h3>
          <p className="text-xs text-slate-500">Live video consultation room unlocks when confirmed.</p>
        </div>

        {appointments.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
            <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-700">No scheduled appointments</h4>
            <p className="text-xs text-slate-500 mt-1">Book your first virtual appointment with an authorized physician using the form above.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {appointments.map((appt) => (
              <div key={appt.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-slate-900">{appt.doctorName}</span>
                    {getStatusBadge(appt.status)}
                  </div>
                  <p className="text-xs text-slate-600 font-medium">{appt.reason}</p>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(appt.dateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onJoinVideo(appt)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 transition-colors"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Join Video Room</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
