import React from 'react';
import { HelpCircle, Phone, AlertTriangle, MessageSquare, FileText } from 'lucide-react';

export const PatientHelpSupportView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Help & Support</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Guidance on managing your health readings and reaching your care team.
        </p>
      </div>

      {/* Emergency Advisory */}
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-xs font-bold text-rose-900 uppercase tracking-wide">Medical Emergency Advisory</h3>
          <p className="text-xs text-rose-800 mt-1 leading-relaxed">
            This telehealth app is not designed for life-threatening emergencies. If you are experiencing
            severe chest pain, sudden shortness of breath, acute confusion, or other medical emergencies, please call
            your local emergency services (<strong>911</strong> or local emergency number) or visit the nearest emergency department immediately.
          </p>
        </div>
      </div>

      {/* Direct Contact Support */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center mb-3">
            <Phone className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Clinic Support Line</h3>
          <p className="text-xs text-slate-500 mt-1 mb-3">
            Available Monday to Friday, 8:00 AM – 6:00 PM for appointment assistance.
          </p>
          <a
            href="tel:+18005550199"
            className="inline-flex items-center text-xs font-semibold text-teal-700 hover:text-teal-800"
          >
            +1 (800) 555-0199
          </a>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-3">
            <MessageSquare className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Care Team Support</h3>
          <p className="text-xs text-slate-500 mt-1 mb-3">
            Questions regarding prescribed medicines, health readings, or appointment preparation.
          </p>
          <span className="text-xs font-semibold text-slate-700">support@telehealth-care.org</span>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100 flex items-center gap-2">
          <FileText className="w-4 h-4 text-teal-700" />
          Frequently Asked Questions
        </h3>

        <div className="space-y-4 text-xs">
          <div>
            <h4 className="font-bold text-slate-800">How does personalized monitoring work?</h4>
            <p className="text-slate-600 mt-1 leading-relaxed">
              When you choose your health conditions in <em>My Health Conditions</em>,
              the portal automatically tailors your <em>Health Monitoring</em> view to display the measurements
              relevant to you, such as Blood Pressure for Hypertension or Blood Glucose for Diabetes.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <h4 className="font-bold text-slate-800">How is my health data stored and protected?</h4>
            <p className="text-slate-600 mt-1 leading-relaxed">
              Your health readings, medical history, and appointments are stored securely according to standard healthcare
              privacy and data security standards. Only authorized doctors and healthcare providers you approve can view your records.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <h4 className="font-bold text-slate-800">What does the Health Risk Assessment mean?</h4>
            <p className="text-slate-600 mt-1 leading-relaxed">
              The Health Risk Assessment reviews your entered readings against clinical guidelines to help you and your care team identify
              trends that may require attention. This information is for support and does not replace medical advice from your doctor.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <h4 className="font-bold text-slate-800">How do I join a doctor consultation?</h4>
            <p className="text-slate-600 mt-1 leading-relaxed">
              Go to <em>Appointments</em> or <em>Consultations</em> in your left sidebar. When your appointment is scheduled or
              active, click the "Join Consultation" button to connect directly with your doctor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
