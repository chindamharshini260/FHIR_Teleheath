import React, { useState, useEffect } from 'react';
import { Appointment, UserAccount } from '../../types';
import { api } from '../../lib/api';
import { Calendar, Clock, Video, CheckCircle2, AlertCircle } from 'lucide-react';

interface PatientAppointmentsProps {
  patientId: string;
  patientName: string;
  onJoinVideo: (appointment: Appointment) => void;
  mode?: 'appointments' | 'consultations';
}

export const PatientAppointments: React.FC<PatientAppointmentsProps> = ({
  patientId,
  patientName,
  onJoinVideo,
  mode = 'appointments',
}) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
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
        const approvedDocs = (docs || []).filter(
          (d) => d.doctorStatus === 'APPROVED' || !d.doctorStatus
        );
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
      setMessage({ text: 'Please fill in all fields to book your appointment.', type: 'error' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const doc = doctors.find((d) => d.id === selectedDoctorId);
    const doctorName = doc?.fullName || 'Doctor';

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
      setMessage({
        text: `Your appointment request has been submitted to Dr. ${doctorName}.`,
        type: 'success',
      });
      setReason('');
      setDateTime('');
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to book appointment.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return isoString;
    }
  };

  // If viewed specifically as "Consultations" page
  if (mode === 'consultations') {
    const upcomingConsultations = appointments.filter(
      (a) => a.status === 'Booked' || a.status === 'Proposed'
    );

    return (
      <div className="max-w-3xl space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="pb-5 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-900">Consultations</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              View and join your scheduled doctor consultations.
            </p>
          </div>

          <div className="pt-5">
            {upcomingConsultations.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 rounded-xl border border-slate-100">
                <Video className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-800">No upcoming consultations.</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Once your appointment is confirmed, you can join the consultation room here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingConsultations.map((appt) => {
                  const d = new Date(appt.dateTime);
                  const dateStr = d.toLocaleDateString('en-US', { dateStyle: 'medium' });
                  const timeStr = d.toLocaleTimeString('en-US', { timeStyle: 'short' });

                  return (
                    <div
                      key={appt.id}
                      className="p-5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">Dr. {appt.doctorName}</h4>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              appt.status === 'Booked'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {appt.status === 'Booked' ? 'Confirmed' : 'Pending Confirmation'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">
                          <strong>Date:</strong> {dateStr} • <strong>Time:</strong> {timeStr}
                        </p>
                        {appt.reason && (
                          <p className="text-xs text-slate-500">
                            Reason: {appt.reason}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => onJoinVideo(appt)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 transition-colors shadow-xs shrink-0"
                      >
                        <Video className="w-4 h-4" />
                        <span>Join Consultation</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Otherwise, default Appointments page
  return (
    <div className="max-w-3xl space-y-6">
      {/* 1. Book Appointment Form */}
      <form onSubmit={handleBookAppointment} className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="pb-4 border-b border-slate-100 mb-5">
          <h2 className="text-xl font-bold text-slate-900">Appointments</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Book an appointment with your healthcare doctor.
          </p>
        </div>

        {message && (
          <div
            className={`mb-4 p-3.5 rounded-lg text-xs flex items-center gap-2 border ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Choose Doctor</label>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none bg-white font-medium text-slate-800"
            >
              {doctors.length === 0 ? (
                <option value="">No doctors available at this time</option>
              ) : (
                doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.fullName} {d.specialty ? `(${d.specialty})` : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Choose Date &amp; Time</label>
            <input
              type="datetime-local"
              required
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Visit</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Blood pressure review, routine checkup, symptoms"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none bg-white"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto inline-flex items-center justify-center py-2.5 px-6 rounded-lg text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 transition-colors disabled:opacity-50 shadow-xs"
            >
              {submitting ? 'Booking...' : 'Book Appointment'}
            </button>
          </div>
        </div>
      </form>

      {/* 2. Upcoming Appointments */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="pb-4 border-b border-slate-100 mb-4">
          <h3 className="text-base font-bold text-slate-900">Upcoming Appointments</h3>
        </div>

        {appointments.length === 0 ? (
          <div className="py-8 text-center bg-slate-50 rounded-xl border border-slate-100">
            <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No upcoming appointments.</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Use the form above to book a new appointment.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {appointments.map((appt) => (
              <div key={appt.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">Dr. {appt.doctorName}</h4>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        appt.status === 'Booked'
                          ? 'bg-emerald-100 text-emerald-800'
                          : appt.status === 'Proposed'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {appt.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{formatDateTime(appt.dateTime)}</p>
                  <p className="text-xs text-slate-500">Reason: {appt.reason}</p>
                </div>

                {appt.status === 'Booked' && (
                  <button
                    onClick={() => onJoinVideo(appt)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors self-start sm:self-center"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Join Video</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
