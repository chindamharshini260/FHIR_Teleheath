/**
 * Telehealth & Remote Vital Monitoring API Client
 * Backed by Google Cloud Firestore and Firebase Authentication.
 *
 * NO mock database. NO dummy database. NO temporary data.
 * All records persist across sessions directly in Cloud Firestore.
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { db, auth } from './firebase';
import {
  UserRole,
  UserAccount,
  PatientProfile,
  SupportedCondition,
  HealthReading,
  Appointment,
  TeleconsultationEncounter,
  Prescription,
  LaboratoryReport,
  PatientConsent,
  AIRiskAssessment,
  AuditEventRecord,
} from '../types';

export const api = {
  // -------------------------------------------------------------
  // AUTHENTICATION & SESSIONS
  // -------------------------------------------------------------
  async login(credentials: {
    email: string;
    password: string;
    role: UserRole;
  }): Promise<{ user: UserAccount }> {
    const email = credentials.email.trim();
    const password = credentials.password;

    let firebaseUser: FirebaseUser | null = null;
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      firebaseUser = userCred.user;
    } catch (err: any) {
      // If user account is not yet created, auto-create it smoothly in Firebase Auth
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/invalid-login-credentials'
      ) {
        try {
          const createCred = await createUserWithEmailAndPassword(auth, email, password);
          firebaseUser = createCred.user;
        } catch (createErr: any) {
          if (createErr.code === 'auth/email-already-in-use') {
            throw new Error('Incorrect password for this email address.');
          }
          throw new Error(createErr.message || 'Authentication error.');
        }
      } else {
        throw new Error(err.message || 'Authentication error.');
      }
    }

    const uid = firebaseUser.uid;

    // Load or initialize user document in Firestore 'users' collection
    const userDocRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userDocRef);
    let userAccount: UserAccount;

    if (userSnap.exists()) {
      userAccount = userSnap.data() as UserAccount;
      // If role changed or was updated
      if (userAccount.role !== credentials.role) {
        userAccount.role = credentials.role;
        await setDoc(userDocRef, { role: credentials.role }, { merge: true });
      }
    } else {
      userAccount = {
        id: uid,
        email: email,
        role: credentials.role,
        fullName: email.split('@')[0],
        createdAt: new Date().toISOString(),
        doctorStatus: credentials.role === 'doctor' ? 'APPROVED' : undefined,
      };
      await setDoc(userDocRef, userAccount);
    }

    // Role-specific profile initialization
    if (credentials.role === 'patient') {
      const patDocRef = doc(db, 'patients', uid);
      const patSnap = await getDoc(patDocRef);
      if (!patSnap.exists()) {
        await setDoc(patDocRef, {
          id: uid,
          userId: uid,
          fullName: userAccount.fullName,
          email: email,
          dateOfBirth: '',
          gender: 'unknown',
          phoneNumber: '',
          emergencyContact: { name: '', relationship: '', phone: '' },
          bloodGroup: '',
          allergies: [],
          currentMedications: [],
          conditions: [],
          medicalHistoryNotes: '',
          updatedAt: new Date().toISOString(),
        });
      }
    } else if (credentials.role === 'doctor') {
      const docRef = doc(db, 'practitioners', uid);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        await setDoc(docRef, {
          id: uid,
          userId: uid,
          fullName: userAccount.fullName,
          email: email,
          licenseNumber: userAccount.licenseNumber || 'MD-LIC-2026',
          specialty: userAccount.specialty || 'General Telehealth',
          hospitalAffiliation: userAccount.hospitalAffiliation || 'Metro Health System',
          doctorStatus: 'APPROVED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // Record audit event in 'auditEvents' collection
    try {
      const auditId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      await setDoc(doc(db, 'auditEvents', auditId), {
        id: auditId,
        userId: uid,
        userRole: credentials.role,
        userEmail: email,
        action: 'LOGIN',
        resourceType: 'User',
        resourceId: uid,
        description: `User ${email} signed in with role ${credentials.role}`,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Audit logging note:', e);
    }

    return { user: userAccount };
  },

  async register(userData: {
    email: string;
    password: string;
    role: UserRole;
    fullName: string;
    dateOfBirth?: string;
    gender?: string;
    phoneNumber?: string;
    bloodGroup?: string;
    allergies?: string[];
    currentMedications?: string[];
    licenseNumber?: string;
    specialty?: string;
    hospitalAffiliation?: string;
  }): Promise<{ user: UserAccount }> {
    const email = userData.email.trim();
    const password = userData.password;

    let userCred;
    try {
      userCred = await createUserWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        userCred = await signInWithEmailAndPassword(auth, email, password);
      } else {
        throw new Error(err.message || 'Registration failed');
      }
    }

    const uid = userCred.user.uid;

    const newUser: UserAccount = {
      id: uid,
      email: email,
      role: userData.role,
      fullName: userData.fullName,
      createdAt: new Date().toISOString(),
      doctorStatus: userData.role === 'doctor' ? 'APPROVED' : undefined,
      licenseNumber: userData.licenseNumber,
      specialty: userData.specialty,
      hospitalAffiliation: userData.hospitalAffiliation,
    };

    await setDoc(doc(db, 'users', uid), newUser);

    if (userData.role === 'patient') {
      const newPatient: PatientProfile = {
        id: uid,
        userId: uid,
        fullName: userData.fullName,
        email: email,
        dateOfBirth: userData.dateOfBirth || '',
        gender: (userData.gender as any) || 'unknown',
        phoneNumber: userData.phoneNumber || '',
        emergencyContact: { name: '', relationship: '', phone: '' },
        bloodGroup: userData.bloodGroup || '',
        allergies: userData.allergies || [],
        currentMedications: userData.currentMedications || [],
        conditions: [],
        medicalHistoryNotes: '',
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'patients', uid), newPatient);

      // Create default active consent in 'consents' collection
      await setDoc(doc(db, 'consents', uid), {
        id: `consent-${uid}`,
        patientId: uid,
        status: 'active',
        purpose: 'telehealth_consultation',
        organization: 'Metro Health System',
        scope: 'all_health_records',
        grantedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        fhirConsentId: `Consent-${uid}`,
      });
    } else if (userData.role === 'doctor') {
      await setDoc(doc(db, 'practitioners', uid), {
        id: uid,
        userId: uid,
        fullName: userData.fullName,
        email: email,
        licenseNumber: userData.licenseNumber || 'MD-LIC-2026',
        specialty: userData.specialty || 'General Telehealth',
        hospitalAffiliation: userData.hospitalAffiliation || 'Metro Health System',
        doctorStatus: 'APPROVED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    try {
      const auditId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      await setDoc(doc(db, 'auditEvents', auditId), {
        id: auditId,
        userId: uid,
        userRole: userData.role,
        userEmail: email,
        action: 'LOGIN',
        resourceType: 'User',
        resourceId: uid,
        description: `Registered new account: ${email} (${userData.role})`,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Audit note:', e);
    }

    return { user: newUser };
  },

  async logout(): Promise<void> {
    await fbSignOut(auth);
  },

  // -------------------------------------------------------------
  // PATIENT PROFILES & MEDICAL CONDITIONS
  // -------------------------------------------------------------
  async getPatientProfile(patientId: string): Promise<PatientProfile | null> {
    const uid = patientId || auth.currentUser?.uid;
    if (!uid) return null;

    try {
      const snap = await getDoc(doc(db, 'patients', uid));
      if (snap.exists()) {
        const data = snap.data() as PatientProfile;
        return {
          ...data,
          conditions: data.conditions || [],
          allergies: data.allergies || [],
          currentMedications: data.currentMedications || [],
        };
      }

      // If document doesn't exist yet, initialize from user account
      const userSnap = await getDoc(doc(db, 'users', uid));
      const userData = userSnap.exists() ? userSnap.data() : null;
      const initial: PatientProfile = {
        id: uid,
        userId: uid,
        fullName: userData?.fullName || auth.currentUser?.displayName || 'Patient',
        email: userData?.email || auth.currentUser?.email || '',
        dateOfBirth: '',
        gender: 'unknown',
        phoneNumber: '',
        emergencyContact: { name: '', relationship: '', phone: '' },
        bloodGroup: '',
        allergies: [],
        currentMedications: [],
        conditions: [],
        medicalHistoryNotes: '',
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'patients', uid), initial, { merge: true });
      return initial;
    } catch (err) {
      console.error('Error fetching patient profile:', err);
      return null;
    }
  },

  async updatePatientProfile(
    patientId: string,
    data: Partial<PatientProfile>
  ): Promise<PatientProfile> {
    const uid = patientId || auth.currentUser?.uid;
    if (!uid) throw new Error('Patient ID required');

    const updatePayload = {
      ...data,
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'patients', uid), updatePayload, { merge: true });
    const updated = await this.getPatientProfile(uid);
    return updated!;
  },

  /**
   * Saves patient's selected medical condition(s) (Diabetes, Hypertension, COPD) to Firestore.
   * Updates 'patients' collection and individual documents in 'conditions' collection.
   */
  async savePatientConditions(
    patientId: string,
    conditions: SupportedCondition[]
  ): Promise<{ conditions: SupportedCondition[] }> {
    const uid = patientId || auth.currentUser?.uid;
    if (!uid) throw new Error('Authentication required to save medical conditions');

    // 1. Update patient record in 'patients' collection
    await setDoc(
      doc(db, 'patients', uid),
      {
        id: uid,
        userId: uid,
        conditions: conditions,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // 2. Create/update individual condition documents in 'conditions' collection
    for (const cond of conditions) {
      const condDocId = `${uid}_${cond}`;
      await setDoc(
        doc(db, 'conditions', condDocId),
        {
          id: condDocId,
          patientId: uid,
          condition: cond,
          clinicalStatus: 'active',
          verificationStatus: 'confirmed',
          recordedDate: new Date().toISOString(),
          fhirConditionId: `Condition-${uid}-${cond}`,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    // 3. Remove inactive condition records for this patient
    try {
      const condQuery = query(collection(db, 'conditions'), where('patientId', '==', uid));
      const condSnap = await getDocs(condQuery);
      for (const d of condSnap.docs) {
        const item = d.data();
        if (!conditions.includes(item.condition)) {
          await deleteDoc(d.ref);
        }
      }
    } catch (e) {
      console.warn('Condition cleanup note:', e);
    }

    // 4. Log audit event in 'auditEvents' collection
    try {
      const auditId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      await setDoc(doc(db, 'auditEvents', auditId), {
        id: auditId,
        userId: uid,
        userRole: 'patient',
        userEmail: auth.currentUser?.email || '',
        action: 'UPDATE_CONDITION',
        resourceType: 'Condition',
        resourceId: uid,
        description: `Updated conditions: ${conditions.join(', ') || 'None'}`,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Audit error:', e);
    }

    return { conditions };
  },

  async toggleCondition(
    patientId: string,
    condition: SupportedCondition,
    active: boolean
  ): Promise<{ conditions: SupportedCondition[] }> {
    const profile = await this.getPatientProfile(patientId);
    let current = profile?.conditions || [];
    if (active && !current.includes(condition)) {
      current = [...current, condition];
    } else if (!active) {
      current = current.filter((c) => c !== condition);
    }
    return this.savePatientConditions(patientId, current);
  },

  async getAllPatients(): Promise<PatientProfile[]> {
    try {
      const snap = await getDocs(collection(db, 'patients'));
      const patients: PatientProfile[] = [];
      snap.forEach((d) => {
        patients.push(d.data() as PatientProfile);
      });
      return patients;
    } catch (err) {
      console.error('Error fetching patients:', err);
      return [];
    }
  },

  // -------------------------------------------------------------
  // HEALTH READINGS & VITAL OBSERVATIONS
  // -------------------------------------------------------------
  async getPatientReadings(patientId: string): Promise<HealthReading[]> {
    const uid = patientId || auth.currentUser?.uid;
    if (!uid) return [];

    try {
      const q = query(collection(db, 'observations'), where('patientId', '==', uid));
      const snap = await getDocs(q);
      const readings: HealthReading[] = [];
      snap.forEach((d) => {
        readings.push(d.data() as HealthReading);
      });

      // Sort descending by date & time
      readings.sort(
        (a, b) =>
          new Date(`${b.date}T${b.time || '00:00'}`).getTime() -
          new Date(`${a.date}T${a.time || '00:00'}`).getTime()
      );
      return readings;
    } catch (err) {
      console.error('Error fetching observations:', err);
      return [];
    }
  },

  async saveReading(
    reading: Omit<HealthReading, 'id' | 'createdAt'>
  ): Promise<HealthReading> {
    const id = `obs-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newReading: HealthReading = {
      ...reading,
      id,
      createdAt: new Date().toISOString(),
      fhirObservationId: id,
    };

    await setDoc(doc(db, 'observations', id), newReading);

    try {
      const auditId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      await setDoc(doc(db, 'auditEvents', auditId), {
        id: auditId,
        userId: reading.patientId,
        userRole: 'patient',
        userEmail: auth.currentUser?.email || '',
        action: 'CREATE_HEALTH_READING',
        resourceType: 'Observation',
        resourceId: id,
        description: `Logged ${reading.parameterType} measurement: ${
          reading.value !== undefined ? reading.value : `${reading.systolic}/${reading.diastolic}`
        } ${reading.unit}`,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Audit note:', e);
    }

    return newReading;
  },

  async saveReadingsBatch(
    patientId: string,
    readingsList: Array<Omit<HealthReading, 'id' | 'patientId' | 'createdAt'>>
  ): Promise<HealthReading[]> {
    const saved: HealthReading[] = [];
    for (const item of readingsList) {
      const r = await this.saveReading({
        ...item,
        patientId,
      });
      saved.push(r);
    }
    return saved;
  },

  async saveTodayCheckin(
    patientId: string,
    readingsData: Array<{
      parameterType: any;
      value?: number;
      systolic?: number;
      diastolic?: number;
      unit: string;
      measurementContext?: any;
      date: string;
      time: string;
      notes?: string;
    }>,
    dateString: string
  ): Promise<HealthReading[]> {
    const results: HealthReading[] = [];
    for (const r of readingsData) {
      const saved = await this.saveReading({
        patientId,
        parameterType: r.parameterType,
        value: r.value,
        systolic: r.systolic,
        diastolic: r.diastolic,
        unit: r.unit,
        measurementContext: r.measurementContext,
        date: dateString,
        time: r.time,
        notes: r.notes || "Today's Check-in reading",
        source: 'Patient',
      });
      results.push(saved);
    }
    return results;
  },

  async updateReading(
    id: string,
    updates: Partial<HealthReading>
  ): Promise<HealthReading> {
    const ref = doc(db, 'observations', id);
    await updateDoc(ref, updates as any);
    const snap = await getDoc(ref);
    return snap.data() as HealthReading;
  },

  // -------------------------------------------------------------
  // APPOINTMENTS & CONSULTATIONS
  // -------------------------------------------------------------
  async getAppointments(filter: {
    patientId?: string;
    doctorId?: string;
  }): Promise<Appointment[]> {
    try {
      let q = collection(db, 'appointments') as any;
      if (filter.patientId) {
        q = query(q, where('patientId', '==', filter.patientId));
      } else if (filter.doctorId) {
        q = query(q, where('doctorId', '==', filter.doctorId));
      }

      const snap = await getDocs(q);
      const appts: Appointment[] = [];
      snap.forEach((d) => {
        appts.push(d.data() as Appointment);
      });
      appts.sort(
        (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
      );
      return appts;
    } catch (err) {
      console.error('Error fetching appointments:', err);
      return [];
    }
  },

  async createAppointment(
    appt: Omit<Appointment, 'id' | 'createdAt'>
  ): Promise<Appointment> {
    const id = `appt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newAppt: Appointment = {
      ...appt,
      id,
      createdAt: new Date().toISOString(),
      fhirAppointmentId: id,
    };
    await setDoc(doc(db, 'appointments', id), newAppt);

    try {
      const auditId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      await setDoc(doc(db, 'auditEvents', auditId), {
        id: auditId,
        userId: appt.patientId,
        userRole: 'patient',
        userEmail: auth.currentUser?.email || '',
        action: 'CREATE_APPOINTMENT',
        resourceType: 'Appointment',
        resourceId: id,
        description: `Scheduled appointment with ${appt.doctorName} for ${appt.dateTime}`,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Audit note:', e);
    }

    return newAppt;
  },

  async updateAppointment(
    id: string,
    update: { status?: Appointment['status']; notes?: string }
  ): Promise<Appointment> {
    const ref = doc(db, 'appointments', id);
    await updateDoc(ref, update);
    const snap = await getDoc(ref);
    return snap.data() as Appointment;
  },

  // -------------------------------------------------------------
  // ENCOUNTERS
  // -------------------------------------------------------------
  async createEncounter(
    enc: Omit<TeleconsultationEncounter, 'id'>
  ): Promise<TeleconsultationEncounter> {
    const id = `enc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newEnc: TeleconsultationEncounter = {
      ...enc,
      id,
      fhirEncounterId: id,
    };
    await setDoc(doc(db, 'encounters', id), newEnc);
    return newEnc;
  },

  async updateEncounter(
    id: string,
    update: Partial<TeleconsultationEncounter>
  ): Promise<TeleconsultationEncounter> {
    const ref = doc(db, 'encounters', id);
    await updateDoc(ref, update);
    const snap = await getDoc(ref);
    return snap.data() as TeleconsultationEncounter;
  },

  // -------------------------------------------------------------
  // PRESCRIPTIONS (MedicationRequests)
  // -------------------------------------------------------------
  async getPrescriptions(filter: {
    patientId?: string;
    doctorId?: string;
  }): Promise<Prescription[]> {
    try {
      let q = collection(db, 'medicationRequests') as any;
      if (filter.patientId) {
        q = query(q, where('patientId', '==', filter.patientId));
      } else if (filter.doctorId) {
        q = query(q, where('doctorId', '==', filter.doctorId));
      }

      const snap = await getDocs(q);
      const items: Prescription[] = [];
      snap.forEach((d) => {
        items.push(d.data() as Prescription);
      });
      items.sort(
        (a, b) =>
          new Date(b.prescribedDate).getTime() - new Date(a.prescribedDate).getTime()
      );
      return items;
    } catch (err) {
      console.error('Error fetching prescriptions:', err);
      return [];
    }
  },

  async createPrescription(
    presc: Omit<Prescription, 'id'>
  ): Promise<Prescription> {
    const id = `med-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newPresc: Prescription = {
      ...presc,
      id,
      fhirMedicationRequestId: id,
    };
    await setDoc(doc(db, 'medicationRequests', id), newPresc);

    try {
      const auditId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      await setDoc(doc(db, 'auditEvents', auditId), {
        id: auditId,
        userId: presc.doctorId,
        userRole: 'doctor',
        userEmail: auth.currentUser?.email || '',
        action: 'CREATE_PRESCRIPTION',
        resourceType: 'MedicationRequest',
        resourceId: id,
        description: `Prescribed ${presc.medication} ${presc.dosage} to ${presc.patientName}`,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Audit note:', e);
    }

    return newPresc;
  },

  // -------------------------------------------------------------
  // LABORATORY & DIAGNOSTIC REPORTS
  // -------------------------------------------------------------
  async getLabReports(patientId?: string): Promise<LaboratoryReport[]> {
    try {
      let q = collection(db, 'diagnosticReports') as any;
      if (patientId) {
        q = query(q, where('patientId', '==', patientId));
      }
      const snap = await getDocs(q);
      const items: LaboratoryReport[] = [];
      snap.forEach((d) => {
        items.push(d.data() as LaboratoryReport);
      });
      items.sort(
        (a, b) => new Date(b.testDate).getTime() - new Date(a.testDate).getTime()
      );
      return items;
    } catch (err) {
      console.error('Error fetching diagnostic reports:', err);
      return [];
    }
  },

  async createLabReport(
    report: Omit<LaboratoryReport, 'id' | 'createdAt'>
  ): Promise<LaboratoryReport> {
    const id = `diag-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newReport: LaboratoryReport = {
      ...report,
      id,
      createdAt: new Date().toISOString(),
      fhirDiagnosticReportId: id,
    };
    await setDoc(doc(db, 'diagnosticReports', id), newReport);

    try {
      const auditId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      await setDoc(doc(db, 'auditEvents', auditId), {
        id: auditId,
        userId: report.labStaffId,
        userRole: 'laboratory_staff',
        userEmail: auth.currentUser?.email || '',
        action: 'UPLOAD_LAB_REPORT',
        resourceType: 'DiagnosticReport',
        resourceId: id,
        description: `Uploaded test report for ${report.patientName}: ${report.testName} (${report.resultValue} ${report.unit})`,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Audit note:', e);
    }

    return newReport;
  },

  // -------------------------------------------------------------
  // CONSENT
  // -------------------------------------------------------------
  async getConsent(patientId: string): Promise<PatientConsent | null> {
    const uid = patientId || auth.currentUser?.uid;
    if (!uid) return null;

    try {
      const snap = await getDoc(doc(db, 'consents', uid));
      if (snap.exists()) {
        return snap.data() as PatientConsent;
      }
      return null;
    } catch (err) {
      console.error('Error fetching consent:', err);
      return null;
    }
  },

  async updateConsent(
    patientId: string,
    consent: Partial<PatientConsent>
  ): Promise<PatientConsent> {
    const uid = patientId || auth.currentUser?.uid;
    if (!uid) throw new Error('Patient ID required');

    const payload = {
      ...consent,
      patientId: uid,
      grantedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'consents', uid), payload, { merge: true });
    const snap = await getDoc(doc(db, 'consents', uid));
    return snap.data() as PatientConsent;
  },

  // -------------------------------------------------------------
  // AI ASSESSMENTS
  // -------------------------------------------------------------
  async getAIAssessments(patientId: string): Promise<AIRiskAssessment[]> {
    const uid = patientId || auth.currentUser?.uid;
    if (!uid) return [];

    try {
      const q = query(collection(db, 'aiAssessments'), where('patientId', '==', uid));
      const snap = await getDocs(q);
      const items: AIRiskAssessment[] = [];
      snap.forEach((d) => {
        items.push(d.data() as AIRiskAssessment);
      });
      return items;
    } catch (err) {
      console.error('Error fetching AI assessments:', err);
      return [];
    }
  },

  async saveAIAssessment(
    assessment: AIRiskAssessment
  ): Promise<AIRiskAssessment> {
    await setDoc(doc(db, 'aiAssessments', assessment.id), assessment);
    return assessment;
  },

  // -------------------------------------------------------------
  // ADMIN & PRACTITIONERS
  // -------------------------------------------------------------
  async getAllUsers(): Promise<UserAccount[]> {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const users: UserAccount[] = [];
      snap.forEach((d) => {
        users.push(d.data() as UserAccount);
      });
      return users;
    } catch (err) {
      console.error('Error fetching users:', err);
      return [];
    }
  },

  async getDoctors(): Promise<UserAccount[]> {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'doctor'));
      const snap = await getDocs(q);
      const doctors: UserAccount[] = [];
      snap.forEach((d) => {
        doctors.push(d.data() as UserAccount);
      });
      return doctors;
    } catch (err) {
      console.error('Error fetching doctors:', err);
      return [];
    }
  },

  async verifyDoctor(
    doctorId: string,
    status: 'APPROVED' | 'REJECTED',
    adminId?: string
  ): Promise<{ success: boolean; user: UserAccount }> {
    await updateDoc(doc(db, 'users', doctorId), { doctorStatus: status });
    try {
      await updateDoc(doc(db, 'practitioners', doctorId), { doctorStatus: status });
    } catch (e) {
      // ignore if not present
    }

    const snap = await getDoc(doc(db, 'users', doctorId));
    const updatedUser = snap.data() as UserAccount;

    try {
      const auditId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      await setDoc(doc(db, 'auditEvents', auditId), {
        id: auditId,
        userId: adminId || 'admin',
        userRole: 'administrator',
        userEmail: auth.currentUser?.email || '',
        action: 'VERIFY_DOCTOR',
        resourceType: 'Practitioner',
        resourceId: doctorId,
        description: `Doctor status updated to ${status} for ${updatedUser.fullName}`,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Audit note:', e);
    }

    return { success: true, user: updatedUser };
  },

  async getAuditEvents(): Promise<AuditEventRecord[]> {
    try {
      const snap = await getDocs(collection(db, 'auditEvents'));
      const events: AuditEventRecord[] = [];
      snap.forEach((d) => {
        events.push(d.data() as AuditEventRecord);
      });
      events.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      return events;
    } catch (err) {
      console.error('Error fetching audit events:', err);
      return [];
    }
  },
};
