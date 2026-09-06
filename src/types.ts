/**
 * FHIR-Compliant Telehealth Platform Type Definitions
 * Adheres strictly to FHIR R4 standard structures and platform roles.
 */

export type UserRole = 'patient' | 'doctor' | 'laboratory_staff' | 'administrator';

export type DoctorStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface UserAccount {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  createdAt: string;
  doctorStatus?: DoctorStatus; // Applicable to doctors
  licenseNumber?: string;
  specialty?: string;
  hospitalAffiliation?: string;
  department?: string; // Applicable to lab staff
}

export type SupportedCondition = 'Diabetes' | 'Hypertension' | 'COPD';

export interface PatientProfile {
  id: string; // matches user id
  userId: string;
  fullName: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender: 'male' | 'female' | 'other' | 'unknown';
  phoneNumber: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  bloodGroup?: string;
  allergies: string[];
  currentMedications: string[];
  medicalHistoryNotes?: string;
  conditions: SupportedCondition[];
  updatedAt: string;
}

export type MeasurementContext = 'Fasting' | 'Post-meal' | 'Random';

export type VitalParameterType =
  | 'blood_glucose'
  | 'hba1c'
  | 'weight'
  | 'blood_pressure'
  | 'heart_rate'
  | 'spo2'
  | 'respiratory_rate';

export interface HealthReading {
  id: string;
  patientId: string;
  parameterType: VitalParameterType;
  // For Blood Pressure, both systolic and diastolic are stored.
  systolic?: number;
  diastolic?: number;
  value?: number; // for single value parameters
  unit: string;
  measurementContext?: MeasurementContext;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  notes?: string;
  source: 'Patient' | 'Doctor' | 'Laboratory' | 'Device';
  createdAt: string;
  fhirObservationId?: string;
}

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH';

export interface AIRiskAssessment {
  id: string;
  patientId: string;
  condition: SupportedCondition;
  status: 'ASSESSED' | 'INSUFFICIENT_DATA';
  riskLevel?: RiskLevel;
  confidenceScore?: number; // 0.00 to 1.00
  inputFeaturesUsed: Record<string, any>;
  missingRequiredFields?: string[];
  message: string;
  clinicalRecommendations: string[];
  modelName: string;
  modelVersion: string;
  assessedAt: string;
  assessedBy?: string; // practitioner ID or 'System'
}

export type AppointmentStatus = 'Proposed' | 'Booked' | 'Cancelled' | 'Fulfilled';

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  dateTime: string; // ISO string
  reason: string;
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
  fhirAppointmentId?: string;
}

export interface TeleconsultationEncounter {
  id: string;
  appointmentId?: string;
  patientId: string;
  doctorId: string;
  startTime: string;
  endTime?: string;
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled';
  clinicalNotes?: string;
  diagnosis?: string;
  fhirEncounterId?: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  prescribedDate: string; // YYYY-MM-DD
  encounterId?: string;
  fhirMedicationRequestId?: string;
}

export interface LaboratoryReport {
  id: string;
  patientId: string;
  patientName: string;
  labStaffId: string;
  testName: string;
  category?: string;
  resultValue: string;
  unit: string;
  referenceRange: string;
  interpretation: 'Normal' | 'Abnormal' | 'Critical' | 'Inconclusive';
  testDate: string; // YYYY-MM-DD
  laboratoryName: string;
  documentUrl?: string;
  fileName?: string;
  notes?: string;
  status?: string;
  createdAt: string;
  fhirDiagnosticReportId?: string;
}

export interface PatientConsent {
  id: string;
  patientId: string;
  status: 'active' | 'rejected' | 'revoked';
  purpose: 'telehealth_consultation' | 'remote_monitoring' | 'ai_risk_stratification' | 'lab_data_sharing';
  organization: string;
  scope: 'all_health_records' | 'vitals_only' | 'consultations_only';
  grantedAt: string;
  expiresAt: string;
  fhirConsentId?: string;
}

export interface AuditEventRecord {
  id: string;
  userId: string;
  userRole: UserRole;
  userEmail: string;
  action:
    | 'LOGIN'
    | 'LOGOUT'
    | 'VIEW_PATIENT_RECORD'
    | 'CREATE_HEALTH_READING'
    | 'UPDATE_HEALTH_READING'
    | 'CREATE_CONDITION'
    | 'UPDATE_CONDITION'
    | 'UPLOAD_LAB_REPORT'
    | 'CREATE_LAB_RESULT'
    | 'REQUEST_AI_ASSESSMENT'
    | 'CREATE_PRESCRIPTION'
    | 'CREATE_APPOINTMENT'
    | 'UPDATE_APPOINTMENT'
    | 'START_CONSULTATION'
    | 'END_CONSULTATION'
    | 'UPDATE_CONSENT'
    | 'VERIFY_DOCTOR';
  resourceType: string;
  resourceId?: string;
  description: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * FHIR R4 Resource Standard Interfaces
 */

export interface FHIRCoding {
  system: string;
  code: string;
  display: string;
}

export interface FHIRCodeableConcept {
  coding: FHIRCoding[];
  text: string;
}

export interface FHIRReference {
  reference: string;
  display?: string;
}

export interface FHIRQuantity {
  value: number;
  unit: string;
  system?: string;
  code?: string;
}

export interface FHIRPatientResource {
  resourceType: 'Patient';
  id: string;
  identifier?: Array<{ system: string; value: string }>;
  active: boolean;
  name: Array<{ use: 'official'; family: string; given: string[] }>;
  telecom: Array<{ system: 'phone' | 'email'; value: string; use?: string }>;
  gender: 'male' | 'female' | 'other' | 'unknown';
  birthDate: string;
  contact?: Array<{
    relationship: FHIRCodeableConcept[];
    name: { text: string };
    telecom: Array<{ system: 'phone'; value: string }>;
  }>;
}

export interface FHIRPractitionerResource {
  resourceType: 'Practitioner';
  id: string;
  identifier?: Array<{ system: string; value: string }>;
  active: boolean;
  name: Array<{ use: 'official'; family: string; given: string[] }>;
  qualification?: Array<{ code: FHIRCodeableConcept; issuer?: FHIRReference }>;
}

export interface FHIROrganizationResource {
  resourceType: 'Organization';
  id: string;
  name: string;
  type?: FHIRCodeableConcept[];
}

export interface FHIRConditionResource {
  resourceType: 'Condition';
  id: string;
  clinicalStatus: FHIRCodeableConcept;
  verificationStatus: FHIRCodeableConcept;
  category: FHIRCodeableConcept[];
  code: FHIRCodeableConcept;
  subject: FHIRReference;
  recordedDate: string;
}

export interface FHIRObservationComponent {
  code: FHIRCodeableConcept;
  valueQuantity: FHIRQuantity;
  interpretation?: FHIRCodeableConcept[];
}

export interface FHIRObservationResource {
  resourceType: 'Observation';
  id: string;
  status: 'registered' | 'preliminary' | 'final' | 'amended';
  category?: FHIRCodeableConcept[];
  code: FHIRCodeableConcept;
  subject: FHIRReference;
  effectiveDateTime: string;
  performer?: FHIRReference[];
  valueQuantity?: FHIRQuantity;
  component?: FHIRObservationComponent[];
  interpretation?: FHIRCodeableConcept[];
  note?: Array<{ text: string }>;
}

export interface FHIRDiagnosticReportResource {
  resourceType: 'DiagnosticReport';
  id: string;
  status: 'registered' | 'partial' | 'preliminary' | 'final';
  category: FHIRCodeableConcept[];
  code: FHIRCodeableConcept;
  subject: FHIRReference;
  effectiveDateTime: string;
  issued: string;
  performer?: FHIRReference[];
  result?: FHIRReference[];
  conclusion?: string;
}

export interface FHIRAppointmentResource {
  resourceType: 'Appointment';
  id: string;
  status: 'proposed' | 'pending' | 'booked' | 'arrived' | 'fulfilled' | 'cancelled' | 'noshow';
  serviceCategory?: FHIRCodeableConcept[];
  description?: string;
  start: string;
  participant: Array<{
    actor: FHIRReference;
    status: 'accepted' | 'declined' | 'tentative' | 'needs-action';
  }>;
}

export interface FHIREncounterResource {
  resourceType: 'Encounter';
  id: string;
  status: 'planned' | 'arrived' | 'triaged' | 'in-progress' | 'onleave' | 'finished' | 'cancelled';
  class: FHIRCoding;
  subject: FHIRReference;
  participant?: Array<{ individual: FHIRReference }>;
  period: { start: string; end?: string };
}

export interface FHIRMedicationRequestResource {
  resourceType: 'MedicationRequest';
  id: string;
  status: 'active' | 'on-hold' | 'cancelled' | 'completed' | 'stopped' | 'draft';
  intent: 'order' | 'proposal' | 'plan';
  medicationCodeableConcept: FHIRCodeableConcept;
  subject: FHIRReference;
  encounter?: FHIRReference;
  authoredOn: string;
  requester?: FHIRReference;
  dosageInstruction?: Array<{
    text: string;
    timing?: { repeat?: { frequency?: number; period?: number; periodUnit?: string } };
  }>;
}

export interface FHIRConsentResource {
  resourceType: 'Consent';
  id: string;
  status: 'draft' | 'active' | 'rejected' | 'inactive' | 'entered-in-error';
  scope: FHIRCodeableConcept;
  category: FHIRCodeableConcept[];
  patient: FHIRReference;
  dateTime: string;
  organization?: FHIRReference[];
}

export interface FHIRAuditEventResource {
  resourceType: 'AuditEvent';
  id: string;
  type: FHIRCoding;
  action: 'C' | 'R' | 'U' | 'D' | 'E';
  recorded: string;
  outcome: '0' | '4' | '8' | '12';
  agent: Array<{
    type?: FHIRCodeableConcept;
    who: FHIRReference;
    requestor: boolean;
  }>;
  source: {
    observer: FHIRReference;
  };
  entity?: Array<{
    what: FHIRReference;
    type?: FHIRCoding;
  }>;
}
