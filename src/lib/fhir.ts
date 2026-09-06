/**
 * FHIR R4 Standard Mapping & Resource Generator
 * Maps real clinical entities and observations to authentic FHIR R4 resources.
 * Standard terminologies: LOINC, SNOMED-CT, UCUM.
 */

import {
  FHIRPatientResource,
  FHIRPractitionerResource,
  FHIROrganizationResource,
  FHIRConditionResource,
  FHIRObservationResource,
  FHIRDiagnosticReportResource,
  FHIRAppointmentResource,
  FHIREncounterResource,
  FHIRMedicationRequestResource,
  FHIRConsentResource,
  FHIRAuditEventResource,
  PatientProfile,
  HealthReading,
  SupportedCondition,
  LaboratoryReport,
  Appointment,
  Prescription,
  TeleconsultationEncounter,
  PatientConsent,
  AuditEventRecord,
} from '../types';

// Official LOINC Codes
export const LOINC_CODES = {
  BLOOD_PRESSURE: { code: '85354-9', display: 'Blood pressure panel with all children optional' },
  SYSTOLIC_BP: { code: '8480-6', display: 'Systolic blood pressure' },
  DIASTOLIC_BP: { code: '8462-4', display: 'Diastolic blood pressure' },
  HEART_RATE: { code: '8867-4', display: 'Heart rate' },
  BLOOD_GLUCOSE: { code: '2339-0', display: 'Glucose [Mass/volume] in Blood' },
  HBA1C: { code: '4548-4', display: 'Hemoglobin A1c/Hemoglobin.total in Blood' },
  BODY_WEIGHT: { code: '29463-7', display: 'Body weight' },
  OXYGEN_SATURATION: { code: '59408-5', display: 'Oxygen saturation in Arterial blood by Pulse oximetry' },
  RESPIRATORY_RATE: { code: '9279-1', display: 'Respiratory rate' },
};

// Official SNOMED CT Codes for Conditions
export const SNOMED_CONDITIONS: Record<SupportedCondition, { code: string; display: string }> = {
  Diabetes: { code: '73211009', display: 'Diabetes mellitus (disorder)' },
  Hypertension: { code: '38341003', display: 'Hypertensive disorder, systemic arterial (disorder)' },
  COPD: { code: '13645005', display: 'Chronic obstructive lung disease (disorder)' },
};

export function buildFHIRPatient(profile: PatientProfile): FHIRPatientResource {
  const [given = '', ...familyParts] = profile.fullName.trim().split(' ');
  const family = familyParts.join(' ') || given;

  return {
    resourceType: 'Patient',
    id: profile.userId,
    identifier: [
      {
        system: 'urn:ietf:rfc:3986',
        value: `urn:uuid:${profile.userId}`,
      },
    ],
    active: true,
    name: [
      {
        use: 'official',
        family,
        given: [given],
      },
    ],
    telecom: [
      {
        system: 'phone',
        value: profile.phoneNumber,
        use: 'mobile',
      },
    ],
    gender: profile.gender,
    birthDate: profile.dateOfBirth,
    contact: profile.emergencyContact?.name
      ? [
          {
            relationship: [
              {
                coding: [
                  {
                    system: 'http://terminology.hl7.org/CodeSystem/v2-0131',
                    code: 'C',
                    display: 'Emergency Contact',
                  },
                ],
                text: profile.emergencyContact.relationship || 'Emergency Contact',
              },
            ],
            name: { text: profile.emergencyContact.name },
            telecom: [{ system: 'phone', value: profile.emergencyContact.phone }],
          },
        ]
      : undefined,
  };
}

export function buildFHIRPractitioner(id: string, fullName: string, license?: string, specialty?: string): FHIRPractitionerResource {
  const [given = '', ...familyParts] = fullName.trim().split(' ');
  return {
    resourceType: 'Practitioner',
    id,
    identifier: license
      ? [
          {
            system: 'http://hl7.org/fhir/sid/us-npi',
            value: license,
          },
        ]
      : undefined,
    active: true,
    name: [
      {
        use: 'official',
        family: familyParts.join(' ') || given,
        given: [given],
      },
    ],
    qualification: specialty
      ? [
          {
            code: {
              coding: [
                {
                  system: 'http://snomed.info/sct',
                  code: '394802001',
                  display: specialty,
                },
              ],
              text: specialty,
            },
          },
        ]
      : undefined,
  };
}

export function buildFHIROrganization(id: string, name: string, typeName = 'Healthcare Provider'): FHIROrganizationResource {
  return {
    resourceType: 'Organization',
    id,
    name,
    type: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/organization-type',
            code: 'prov',
            display: typeName,
          },
        ],
        text: typeName,
      },
    ],
  };
}

export function buildFHIRCondition(patientId: string, condition: SupportedCondition): FHIRConditionResource {
  const snomed = SNOMED_CONDITIONS[condition];
  return {
    resourceType: 'Condition',
    id: `cond-${patientId}-${condition.toLowerCase()}`,
    clinicalStatus: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
          code: 'active',
          display: 'Active',
        },
      ],
      text: 'Active',
    },
    verificationStatus: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
          code: 'confirmed',
          display: 'Confirmed',
        },
      ],
      text: 'Confirmed',
    },
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/condition-category',
            code: 'problem-list-item',
            display: 'Problem List Item',
          },
        ],
        text: 'Problem List Item',
      },
    ],
    code: {
      coding: [
        {
          system: 'http://snomed.info/sct',
          code: snomed.code,
          display: snomed.display,
        },
      ],
      text: condition,
    },
    subject: {
      reference: `Patient/${patientId}`,
    },
    recordedDate: new Date().toISOString().split('T')[0],
  };
}

export function buildFHIRObservation(reading: HealthReading): FHIRObservationResource {
  const effectiveDateTime = `${reading.date}T${reading.time || '00:00'}:00Z`;
  const subject = { reference: `Patient/${reading.patientId}` };
  const baseCategory = [
    {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/observation-category',
          code: 'vital-signs',
          display: 'Vital Signs',
        },
      ],
      text: 'Vital Signs',
    },
  ];

  if (reading.parameterType === 'blood_pressure') {
    return {
      resourceType: 'Observation',
      id: reading.id,
      status: 'final',
      category: baseCategory,
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: LOINC_CODES.BLOOD_PRESSURE.code,
            display: LOINC_CODES.BLOOD_PRESSURE.display,
          },
        ],
        text: 'Blood Pressure Panel',
      },
      subject,
      effectiveDateTime,
      component: [
        {
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: LOINC_CODES.SYSTOLIC_BP.code,
                display: LOINC_CODES.SYSTOLIC_BP.display,
              },
            ],
            text: 'Systolic blood pressure',
          },
          valueQuantity: {
            value: Number(reading.systolic),
            unit: 'mmHg',
            system: 'http://unitsofmeasure.org',
            code: 'mm[Hg]',
          },
        },
        {
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: LOINC_CODES.DIASTOLIC_BP.code,
                display: LOINC_CODES.DIASTOLIC_BP.display,
              },
            ],
            text: 'Diastolic blood pressure',
          },
          valueQuantity: {
            value: Number(reading.diastolic),
            unit: 'mmHg',
            system: 'http://unitsofmeasure.org',
            code: 'mm[Hg]',
          },
        },
      ],
      note: reading.notes ? [{ text: reading.notes }] : undefined,
    };
  }

  // Single-value vital sign observations
  let loinc = LOINC_CODES.HEART_RATE;
  let codeText = 'Vital Sign';
  let ucumCode = reading.unit;

  switch (reading.parameterType) {
    case 'blood_glucose':
      loinc = LOINC_CODES.BLOOD_GLUCOSE;
      codeText = reading.measurementContext ? `Blood Glucose (${reading.measurementContext})` : 'Blood Glucose';
      ucumCode = 'mg/dL';
      break;
    case 'hba1c':
      loinc = LOINC_CODES.HBA1C;
      codeText = 'Hemoglobin A1c';
      ucumCode = '%';
      break;
    case 'weight':
      loinc = LOINC_CODES.BODY_WEIGHT;
      codeText = 'Body Weight';
      ucumCode = 'kg';
      break;
    case 'heart_rate':
      loinc = LOINC_CODES.HEART_RATE;
      codeText = 'Heart Rate';
      ucumCode = '/min';
      break;
    case 'spo2':
      loinc = LOINC_CODES.OXYGEN_SATURATION;
      codeText = 'Oxygen Saturation';
      ucumCode = '%';
      break;
    case 'respiratory_rate':
      loinc = LOINC_CODES.RESPIRATORY_RATE;
      codeText = 'Respiratory Rate';
      ucumCode = '/min';
      break;
  }

  return {
    resourceType: 'Observation',
    id: reading.id,
    status: 'final',
    category: baseCategory,
    code: {
      coding: [
        {
          system: 'http://loinc.org',
          code: loinc.code,
          display: loinc.display,
        },
      ],
      text: codeText,
    },
    subject,
    effectiveDateTime,
    valueQuantity: {
      value: Number(reading.value),
      unit: reading.unit,
      system: 'http://unitsofmeasure.org',
      code: ucumCode,
    },
    note: reading.notes ? [{ text: reading.notes }] : undefined,
  };
}

export function buildFHIRDiagnosticReport(report: LaboratoryReport): FHIRDiagnosticReportResource {
  return {
    resourceType: 'DiagnosticReport',
    id: report.id,
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
            code: 'LAB',
            display: 'Laboratory',
          },
        ],
        text: 'Laboratory',
      },
    ],
    code: {
      coding: [
        {
          system: 'http://loinc.org',
          code: '11502-2',
          display: report.testName,
        },
      ],
      text: report.testName,
    },
    subject: {
      reference: `Patient/${report.patientId}`,
      display: report.patientName,
    },
    effectiveDateTime: `${report.testDate}T09:00:00Z`,
    issued: report.createdAt || new Date().toISOString(),
    performer: [
      {
        reference: `Organization/${report.labStaffId}`,
        display: report.laboratoryName,
      },
    ],
    conclusion: `Result: ${report.resultValue} ${report.unit}. Reference Range: ${report.referenceRange}. Interpretation: ${report.interpretation}.`,
  };
}

export function buildFHIRAppointment(appt: Appointment): FHIRAppointmentResource {
  const statusMap: Record<string, FHIRAppointmentResource['status']> = {
    Proposed: 'proposed',
    Booked: 'booked',
    Cancelled: 'cancelled',
    Fulfilled: 'fulfilled',
  };

  return {
    resourceType: 'Appointment',
    id: appt.id,
    status: statusMap[appt.status] || 'booked',
    description: appt.reason,
    start: appt.dateTime,
    participant: [
      {
        actor: { reference: `Patient/${appt.patientId}`, display: appt.patientName },
        status: 'accepted',
      },
      {
        actor: { reference: `Practitioner/${appt.doctorId}`, display: appt.doctorName },
        status: 'accepted',
      },
    ],
  };
}

export function buildFHIREncounter(enc: TeleconsultationEncounter, patientName?: string, doctorName?: string): FHIREncounterResource {
  return {
    resourceType: 'Encounter',
    id: enc.id,
    status: enc.status === 'completed' ? 'finished' : enc.status === 'in-progress' ? 'in-progress' : 'planned',
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'VR',
      display: 'Virtual Telehealth Encounter',
    },
    subject: {
      reference: `Patient/${enc.patientId}`,
      display: patientName,
    },
    participant: [
      {
        individual: { reference: `Practitioner/${enc.doctorId}`, display: doctorName },
      },
    ],
    period: {
      start: enc.startTime,
      end: enc.endTime,
    },
  };
}

export function buildFHIRMedicationRequest(presc: Prescription): FHIRMedicationRequestResource {
  return {
    resourceType: 'MedicationRequest',
    id: presc.id,
    status: 'active',
    intent: 'order',
    medicationCodeableConcept: {
      coding: [
        {
          system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
          code: 'MED',
          display: presc.medication,
        },
      ],
      text: presc.medication,
    },
    subject: {
      reference: `Patient/${presc.patientId}`,
      display: presc.patientName,
    },
    authoredOn: presc.prescribedDate,
    requester: {
      reference: `Practitioner/${presc.doctorId}`,
      display: presc.doctorName,
    },
    dosageInstruction: [
      {
        text: `${presc.dosage}, ${presc.frequency} for ${presc.duration}. ${presc.instructions}`,
      },
    ],
  };
}

export function buildFHIRConsent(consent: PatientConsent): FHIRConsentResource {
  return {
    resourceType: 'Consent',
    id: consent.id,
    status: consent.status === 'active' ? 'active' : consent.status === 'rejected' ? 'rejected' : 'inactive',
    scope: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/consentscope',
          code: 'patient-privacy',
          display: 'Privacy Consent',
        },
      ],
      text: consent.purpose,
    },
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/consentcategorycodes',
            code: 'npp',
            display: 'Notice of Privacy Practices',
          },
        ],
        text: consent.scope,
      },
    ],
    patient: {
      reference: `Patient/${consent.patientId}`,
    },
    dateTime: consent.grantedAt,
    organization: [
      {
        reference: `Organization/${consent.organization}`,
      },
    ],
  };
}

export function buildFHIRAuditEvent(evt: AuditEventRecord): FHIRAuditEventResource {
  const actionMap: Record<string, 'C' | 'R' | 'U' | 'D' | 'E'> = {
    CREATE_HEALTH_READING: 'C',
    CREATE_CONDITION: 'C',
    UPLOAD_LAB_REPORT: 'C',
    CREATE_PRESCRIPTION: 'C',
    CREATE_APPOINTMENT: 'C',
    VIEW_PATIENT_RECORD: 'R',
    UPDATE_HEALTH_READING: 'U',
    UPDATE_CONDITION: 'U',
    UPDATE_APPOINTMENT: 'U',
    UPDATE_CONSENT: 'U',
    VERIFY_DOCTOR: 'U',
    LOGIN: 'E',
    LOGOUT: 'E',
    REQUEST_AI_ASSESSMENT: 'E',
    START_CONSULTATION: 'E',
    END_CONSULTATION: 'E',
  };

  return {
    resourceType: 'AuditEvent',
    id: evt.id,
    type: {
      system: 'http://terminology.hl7.org/CodeSystem/audit-event-type',
      code: 'rest',
      display: 'RESTful Operation',
    },
    action: actionMap[evt.action] || 'E',
    recorded: evt.timestamp,
    outcome: '0', // Success
    agent: [
      {
        who: { reference: `${evt.userRole}/${evt.userId}`, display: evt.userEmail },
        requestor: true,
      },
    ],
    source: {
      observer: { reference: 'Device/telehealth-platform-server', display: 'FHIR Telehealth Server' },
    },
    entity: [
      {
        what: { reference: `${evt.resourceType}/${evt.resourceId || 'unknown'}` },
      },
    ],
  };
}
