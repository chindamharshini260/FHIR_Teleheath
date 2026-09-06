import React from 'react';
import { HelpCircle, Phone, AlertTriangle, MessageSquare, FileText, CheckCircle2 } from 'lucide-react';

export const PatientHelpSupportView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Help & Support</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Guidance on using the FHIR Telehealth portal and reaching your care team.
        </p>
      </div>

      {/* Emergency Advisory */}
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-xs font-bold text-rose-900 uppercase tracking-wide">Medical Emergency Advisory</h3>
          <p className="text-xs text-rose-800 mt-1 leading-relaxed">
            This telehealth portal is not designed for urgent or life-threatening emergencies. If you are experiencing
            severe chest pain, sudden shortness of breath, acute confusion, or other medical emergencies, please call
            your local emergency services (<strong>911</strong> or local equivalent) or visit the nearest hospital emergency department immediately.
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
            Available Monday to Friday, 8:00 AM – 6:00 PM for telehealth appointment assistance.
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
          <h3 className="text-sm font-bold text-slate-900">Clinical Nurse Support</h3>
          <p className="text-xs text-slate-500 mt-1 mb-3">
            Questions regarding prescribed medications, vital trends, or appointment preparation.
          </p>
          <span className="text-xs font-semibold text-slate-700">support@telehealth-fhir.org</span>
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
            <h4 className="font-bold text-slate-800">How does condition-based monitoring work?</h4>
            <p className="text-slate-600 mt-1 leading-relaxed">
              When you select your chronic conditions (such as Diabetes, Hypertension, or COPD) in <em>Medical Conditions</em>,
              the portal automatically customizes your <em>Health Monitoring</em> view to present only the clinical parameters
              relevant to your disease management.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <h4 className="font-bold text-slate-800">Are my vital measurements compliant with FHIR standards?</h4>
            <p className="text-slate-600 mt-1 leading-relaxed">
              Yes. Every blood pressure, blood glucose, oxygen saturation, and vital measurement you record is structured as an
              official HL7 FHIR R4 Observation resource using standard LOINC terminology codes.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <h4 className="font-bold text-slate-800">What does the AI Risk Assessment signify?</h4>
            <p className="text-slate-600 mt-1 leading-relaxed">
              The AI Risk Assessment applies validated clinical decision guidelines to assist your care team in identifying
              potential health risks early. It is an adjunct decision-support tool and does not constitute a formal diagnosis.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <h4 className="font-bold text-slate-800">How do I join a video teleconsultation?</h4>
            <p className="text-slate-600 mt-1 leading-relaxed">
              Go to <em>Appointments</em> or <em>Consultations</em> in your left sidebar. When your appointment is scheduled or
              active, click the "Join Teleconsultation" button to connect directly with your healthcare provider.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
