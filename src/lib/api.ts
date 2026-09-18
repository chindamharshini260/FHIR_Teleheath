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
  onSnapshot,
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from './firebase';
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
  DoctorStatus,
  normalizeRole,
} from '../types';

/**
 * Recursively removes any properties with `undefined` values from an object or array.
 * Cloud Firestore strictly rejects `undefined` field values on setDoc, updateDoc, and addDoc.
 */
export function sanitizeFirestoreData<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeFirestoreData(item)) as unknown as T;
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj as Record<string, any>)) {
    if (value !== undefined) {
      clean[key] = sanitizeFirestoreData(value);
    }
  }
  return clean as T;
}

/**
 * Constructs a role-aware UserAccount document strictly compliant with Firestore.
 * - For Patient: does NOT include doctorStatus or doctor-specific fields.
 * - For Doctor: explicitly initializes doctorStatus to 'PENDING'.
 * - For Laboratory Staff: includes department if provided, no doctorStatus.
 * - For Administrator: no doctorStatus.
 * - Never includes any undefined fields.
 */
function buildUserDocument(params: {
  uid: string;
  email: string;
  role: UserRole;
  fullName?: string;
  name?: string;
  doctorStatus?: DoctorStatus;
  licenseNumber?: string;
  specialty?: string;
  hospitalAffiliation?: string;
  department?: string;
}): UserAccount {
  const resolvedName = (params.name || params.fullName || params.email.split('@')[0] || 'User').trim();
  const nowIso = new Date().toISOString();
  const effectiveRole = normalizeRole(params.role);
  const userDoc: Record<string, any> = {
    id: params.uid,
    uid: params.uid,
    email: params.email.trim(),
    role: effectiveRole,
    name: resolvedName,
    fullName: resolvedName,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  if (effectiveRole === 'doctor') {
    // Doctors require an explicit doctorStatus ('PENDING' upon initial registration)
    // IMPORTANT: doctorStatus must NEVER be undefined.
    userDoc.doctorStatus = params.doctorStatus || 'PENDING';
    if (params.licenseNumber && params.licenseNumber.trim() !== '') {
      userDoc.licenseNumber = params.licenseNumber.trim();
    }
    if (params.specialty && params.specialty.trim() !== '') {
      userDoc.specialty = params.specialty.trim();
    }
    if (params.hospitalAffiliation && params.hospitalAffiliation.trim() !== '') {
      userDoc.hospitalAffiliation = params.hospitalAffiliation.trim();
    }
  } else if (effectiveRole === 'lab') {
    if (params.department && params.department.trim() !== '') {
      userDoc.department = params.department.trim();
    }
  }
  // For 'patient' and 'admin': doctorStatus is completely omitted

  return sanitizeFirestoreData(userDoc as UserAccount);
}

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
      if (err.code === 'auth/operation-not-allowed') {
        throw new Error(
          `[${err.code}]: ${err.message || 'Email/Password sign-in is disabled in your Firebase project (fhir-e1670).'}`
        );
      }
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
          if (createErr.code === 'auth/operation-not-allowed') {
            throw new Error(
              `[${createErr.code}]: ${createErr.message || 'Email/Password sign-in is disabled in your Firebase project (fhir-e1670).'}`
            );
          }
          if (createErr.code === 'auth/email-already-in-use') {
            throw new Error('Incorrect password for this email address.');
          }
          if (createErr.code === 'auth/weak-password') {
            throw new Error('Password must be at least 6 characters.');
          }
          throw new Error(
            createErr.code ? `[${createErr.code}]: ${createErr.message}` : (createErr.message || 'Authentication error.')
          );
        }
      } else if (err.code === 'auth/wrong-password') {
        throw new Error('Incorrect password for this email address.');
      } else if (err.code === 'auth/too-many-requests') {
        throw new Error('Too many failed login attempts. Please wait a moment before trying again.');
      } else {
        throw new Error(err.code ? `[${err.code}]: ${err.message}` : (err.message || 'Login failed'));
      }
    }

    const uid = firebaseUser.uid;

    // Fetch the user's Firestore document from the 'users' collection using UID
    const userDocRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userDocRef);
    let userAccount: UserAccount;

    if (userSnap.exists()) {
      const data = userSnap.data();
      let role = normalizeRole(data.role);
      if (role !== 'admin' && role !== 'lab' && (data.doctorStatus || data.licenseNumber)) {
        role = 'doctor';
      }
      userAccount = {
        ...data,
        id: uid,
        uid: uid,
        role,
      } as UserAccount;
    } else {
      // First-time user creation if no document exists yet
      const targetRole = credentials.role ? normalizeRole(credentials.role) : 'patient';
      userAccount = buildUserDocument({
        uid,
        email,
        role: targetRole,
        fullName: email.split('@')[0],
        doctorStatus: targetRole === 'doctor' ? 'PENDING' : undefined,
      });
      await setDoc(userDocRef, sanitizeFirestoreData(userAccount));

      // Role-specific profile initialization
      if (targetRole === 'patient') {
        const patDocRef = doc(db, 'patients', uid);
        const patSnap = await getDoc(patDocRef);
        if (!patSnap.exists()) {
          const initialPatient: PatientProfile = {
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
          };
          await setDoc(patDocRef, sanitizeFirestoreData(initialPatient));
        }
        const consentDocRef = doc(db, 'consents', uid);
        const consentSnap = await getDoc(consentDocRef);
        if (!consentSnap.exists()) {
          await setDoc(consentDocRef, sanitizeFirestoreData({
            id: `consent-${uid}`,
            patientId: uid,
            status: 'active',
            purpose: 'telehealth_consultation',
            organization: 'Metro Health System',
            scope: 'all_health_records',
            grantedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            fhirConsentId: `Consent-${uid}`,
          }));
        }
      } else if (targetRole === 'doctor') {
        const docRef = doc(db, 'practitioners', uid);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          const practitionerData = {
            id: uid,
            userId: uid,
            fullName: userAccount.fullName,
            email: email,
            licenseNumber: userAccount.licenseNumber || 'MD-LIC-2026',
            specialty: userAccount.specialty || 'General Telehealth',
            hospitalAffiliation: userAccount.hospitalAffiliation || 'Metro Health System',
            doctorStatus: userAccount.doctorStatus || 'PENDING',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await setDoc(docRef, sanitizeFirestoreData(practitionerData));
        }
      }
    }

    const effectiveRole = normalizeRole(userAccount.role);

    // Record audit event in 'auditEvents' collection
    try {
      const auditId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      await setDoc(doc(db, 'auditEvents', auditId), sanitizeFirestoreData({
        id: auditId,
        userId: uid,
        userRole: userAccount.role,
        userEmail: email,
        action: 'LOGIN',
        resourceType: 'User',
        resourceId: uid,
        description: `User ${email} signed in with role ${userAccount.role}`,
        timestamp: new Date().toISOString(),
      }));
    } catch (e) {
      console.warn('Audit logging note:', e);
    }

    return { user: userAccount };
  },

  async loginWithGoogle(role: UserRole): Promise<{ user: UserAccount }> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const userCred = await signInWithPopup(auth, provider);
    const firebaseUser = userCred.user;
    const uid = firebaseUser.uid;
    const email = firebaseUser.email || '';
    const fullName = firebaseUser.displayName || email.split('@')[0] || 'User';

    // Fetch the user's Firestore document from the 'users' collection using UID
    const userDocRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userDocRef);
    let userAccount: UserAccount;

    if (userSnap.exists()) {
      const data = userSnap.data();
      let detectedRole = normalizeRole(data.role);
      if (detectedRole !== 'admin' && detectedRole !== 'lab' && (data.doctorStatus || data.licenseNumber)) {
        detectedRole = 'doctor';
      }
      userAccount = {
        ...data,
        id: uid,
        uid: uid,
        role: detectedRole,
      } as UserAccount;
    } else {
      // First-time user creation
      const targetRole = role ? normalizeRole(role) : 'patient';
      userAccount = buildUserDocument({
        uid,
        email,
        role: targetRole,
        fullName,
        doctorStatus: targetRole === 'doctor' ? 'PENDING' : undefined,
      });
      await setDoc(userDocRef, sanitizeFirestoreData(userAccount));

      // Role-specific profile initialization
      if (targetRole === 'patient') {
        const patDocRef = doc(db, 'patients', uid);
        const patSnap = await getDoc(patDocRef);
        if (!patSnap.exists()) {
          const initialPatient: PatientProfile = {
            id: uid,
            userId: uid,
            fullName: userAccount.fullName,
            email: email,
            dateOfBirth: '',
            gender: 'unknown',
            phoneNumber: firebaseUser.phoneNumber || '',
            emergencyContact: { name: '', relationship: '', phone: '' },
            bloodGroup: '',
            allergies: [],
            currentMedications: [],
            conditions: [],
            medicalHistoryNotes: '',
            updatedAt: new Date().toISOString(),
          };
          await setDoc(patDocRef, sanitizeFirestoreData(initialPatient));
        }
        const consentDocRef = doc(db, 'consents', uid);
        const consentSnap = await getDoc(consentDocRef);
        if (!consentSnap.exists()) {
          await setDoc(consentDocRef, sanitizeFirestoreData({
            id: `consent-${uid}`,
            patientId: uid,
            status: 'active',
            purpose: 'telehealth_consultation',
            organization: 'Metro Health System',
            scope: 'all_health_records',
            grantedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            fhirConsentId: `Consent-${uid}`,
          }));
        }
      } else if (targetRole === 'doctor') {
        const docRef = doc(db, 'practitioners', uid);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          const practitionerData = {
            id: uid,
            userId: uid,
            fullName: userAccount.fullName,
            email: email,
            licenseNumber: 'MD-LIC-2026',
            specialty: 'General Telehealth',
            hospitalAffiliation: 'Metro Health System',
            doctorStatus: 'PENDING',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await setDoc(docRef, sanitizeFirestoreData(practitionerData));
        }
      }
    }

    const effectiveRole = normalizeRole(userAccount.role);

    try {
      const auditId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      await setDoc(doc(db, 'auditEvents', auditId), sanitizeFirestoreData({
        id: auditId,
        userId: uid,
        userRole: userAccount.role,
        userEmail: email,
        action: 'LOGIN',
        resourceType: 'User',
        resourceId: uid,
        description: `User ${email} signed in with Google (${userAccount.role})`,
        timestamp: new Date().toISOString(),
      }));
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
    emergencyContact?: { name: string; relationship: string; phone: string };
    bloodGroup?: string;
    allergies?: string[];
    currentMedications?: string[];
    licenseNumber?: string;
    specialty?: string;
    hospitalAffiliation?: string;
    department?: string;
  }): Promise<{ user: UserAccount }> {
    const email = userData.email.trim();
    const password = userData.password;

    let userCred;
    try {
      userCred = await createUserWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        throw new Error(
          `[${err.code}]: ${err.message || 'Email/Password sign-in is disabled in your Firebase project.'}`
        );
      }
      if (err.code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered. Please switch to the Login tab.');
      } else if (err.code === 'auth/weak-password') {
        throw new Error('Password must be at least 6 characters long.');
      } else {
        throw new Error(err.code ? `[${err.code}]: ${err.message}` : (err.message || 'Registration failed'));
      }
    }

    const uid = userCred.user.uid;
    const effectiveRole = normalizeRole(userData.role);

    // Build role-aware user document:
    // - Patient: role: "patient" (NO doctorStatus)
    // - Doctor: role: "doctor", doctorStatus: "PENDING"
    // - Lab Staff: role: "lab" (NO doctorStatus)
    // - Administrator: role: "admin" (NO doctorStatus)
    const newUser = buildUserDocument({
      uid,
      email,
      role: effectiveRole,
      fullName: userData.fullName,
      doctorStatus: effectiveRole === 'doctor' ? 'PENDING' : undefined,
      licenseNumber: userData.licenseNumber,
      specialty: userData.specialty,
      hospitalAffiliation: userData.hospitalAffiliation,
      department: userData.department,
    });

    await setDoc(doc(db, 'users', uid), sanitizeFirestoreData(newUser));

    if (effectiveRole === 'patient') {
      const newPatient: PatientProfile = {
        id: uid,
        userId: uid,
        fullName: userData.fullName,
        email: email,
        dateOfBirth: userData.dateOfBirth || '',
        gender: (userData.gender as any) || 'unknown',
        phoneNumber: userData.phoneNumber || '',
        emergencyContact: userData.emergencyContact || { name: '', relationship: '', phone: '' },
        bloodGroup: userData.bloodGroup || '',
        allergies: userData.allergies || [],
        currentMedications: userData.currentMedications || [],
        conditions: [],
        medicalHistoryNotes: '',
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'patients', uid), sanitizeFirestoreData(newPatient));

      // Create default active consent in 'consents' collection
      await setDoc(doc(db, 'consents', uid), sanitizeFirestoreData({
        id: `consent-${uid}`,
        patientId: uid,
        status: 'active',
        purpose: 'telehealth_consultation',
        organization: 'Metro Health System',
        scope: 'all_health_records',
        grantedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        fhirConsentId: `Consent-${uid}`,
      }));
    } else if (effectiveRole === 'doctor') {
      const practitionerData = {
        id: uid,
        userId: uid,
        fullName: userData.fullName,
        email: email,
        licenseNumber: userData.licenseNumber || 'MD-LIC-2026',
        specialty: userData.specialty || 'General Telehealth',
        hospitalAffiliation: userData.hospitalAffiliation || 'Metro Health System',
        doctorStatus: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'practitioners', uid), sanitizeFirestoreData(practitionerData));
    }

    try {
      const auditId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      await setDoc(doc(db, 'auditEvents', auditId), sanitizeFirestoreData({
        id: auditId,
        userId: uid,
        userRole: userData.role,
        userEmail: email,
        action: 'LOGIN',
        resourceType: 'User',
        resourceId: uid,
        description: `Registered new account: ${email} (${userData.role})`,
        timestamp: new Date().toISOString(),
      }));
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
      await setDoc(doc(db, 'patients', uid), sanitizeFirestoreData(initial), { merge: true });
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

    const updatePayload = sanitizeFirestoreData({
      ...data,
      updatedAt: new Date().toISOString(),
    });

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
      sanitizeFirestoreData({
        id: uid,
        userId: uid,
        conditions: conditions,
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );

    // 2. Create/update individual condition documents in 'conditions' collection
    for (const cond of conditions) {
      const condDocId = `${uid}_${cond}`;
      await setDoc(
        doc(db, 'conditions', condDocId),
        sanitizeFirestoreData({
          id: condDocId,
          patientId: uid,
          condition: cond,
          clinicalStatus: 'active',
          verificationStatus: 'confirmed',
          recordedDate: new Date().toISOString(),
          fhirConditionId: `Condition-${uid}-${cond}`,
          updatedAt: new Date().toISOString(),
        }),
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
      await setDoc(doc(db, 'auditEvents', auditId), sanitizeFirestoreData({
        id: auditId,
        userId: uid,
        userRole: 'patient',
        userEmail: auth.currentUser?.email || '',
        action: 'UPDATE_CONDITION',
        resourceType: 'Condition',
        resourceId: uid,
        description: `Updated conditions: ${conditions.join(', ') || 'None'}`,
        timestamp: new Date().toISOString(),
      }));
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

    await setDoc(doc(db, 'observations', id), sanitizeFirestoreData(newReading));

    try {
      const auditId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      await setDoc(doc(db, 'auditEvents', auditId), sanitizeFirestoreData({
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
      }));
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
    await updateDoc(ref, sanitizeFirestoreData(updates as any));
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
    await setDoc(doc(db, 'appointments', id), sanitizeFirestoreData(newAppt));

    try {
      const auditId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      await setDoc(doc(db, 'auditEvents', auditId), sanitizeFirestoreData({
        id: auditId,
        userId: appt.patientId,
        userRole: 'patient',
        userEmail: auth.currentUser?.email || '',
        action: 'CREATE_APPOINTMENT',
        resourceType: 'Appointment',
        resourceId: id,
        description: `Scheduled appointment with ${appt.doctorName} for ${appt.dateTime}`,
        timestamp: new Date().toISOString(),
      }));
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
    await updateDoc(ref, sanitizeFirestoreData(update));
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
    await setDoc(doc(db, 'encounters', id), sanitizeFirestoreData(newEnc));
    return newEnc;
  },

  async updateEncounter(
    id: string,
    update: Partial<TeleconsultationEncounter>
  ): Promise<TeleconsultationEncounter> {
    const ref = doc(db, 'encounters', id);
    await updateDoc(ref, sanitizeFirestoreData(update));
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
    await setDoc(doc(db, 'medicationRequests', id), sanitizeFirestoreData(newPresc));

    try {
      const auditId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      await setDoc(doc(db, 'auditEvents', auditId), sanitizeFirestoreData({
        id: auditId,
        userId: presc.doctorId,
        userRole: 'doctor',
        userEmail: auth.currentUser?.email || '',
        action: 'CREATE_PRESCRIPTION',
        resourceType: 'MedicationRequest',
        resourceId: id,
        description: `Prescribed ${presc.medication} ${presc.dosage} to ${presc.patientName}`,
        timestamp: new Date().toISOString(),
      }));
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
    await setDoc(doc(db, 'diagnosticReports', id), sanitizeFirestoreData(newReport));

    try {
      const auditId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      await setDoc(doc(db, 'auditEvents', auditId), sanitizeFirestoreData({
        id: auditId,
        userId: report.labStaffId,
        userRole: 'laboratory_staff',
        userEmail: auth.currentUser?.email || '',
        action: 'UPLOAD_LAB_REPORT',
        resourceType: 'DiagnosticReport',
        resourceId: id,
        description: `Uploaded test report for ${report.patientName}: ${report.testName} (${report.resultValue} ${report.unit})`,
        timestamp: new Date().toISOString(),
      }));
    } catch (e) {
      console.warn('Audit note:', e);
    }

    return newReport;
  },

  /**
   * Uploads medical documents or laboratory attachments to Firebase Storage
   * and returns the public download URL.
   */
  async uploadMedicalDocument(
    file: File,
    folder: string = 'medical_documents'
  ): Promise<string> {
    const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const storageRef = ref(storage, `${folder}/${filename}`);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
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
      // If no consent record exists yet for this patient, create and return default active consent
      const defaultConsent: PatientConsent = {
        id: `consent-${uid}`,
        patientId: uid,
        status: 'active',
        purpose: 'telehealth_consultation',
        organization: 'Metro Health System',
        scope: 'all_health_records',
        grantedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        fhirConsentId: `Consent-${uid}`,
      };
      try {
        await setDoc(doc(db, 'consents', uid), sanitizeFirestoreData(defaultConsent));
      } catch (saveErr) {
        console.warn('Could not auto-initialize consent document:', saveErr);
      }
      return defaultConsent;
    } catch (err) {
      console.warn('Consent fetch notice, returning active default consent:', err);
      return {
        id: `consent-${uid}`,
        patientId: uid,
        status: 'active',
        purpose: 'telehealth_consultation',
        organization: 'Metro Health System',
        scope: 'all_health_records',
        grantedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        fhirConsentId: `Consent-${uid}`,
      };
    }
  },

  async updateConsent(
    patientId: string,
    consent: Partial<PatientConsent>
  ): Promise<PatientConsent> {
    const uid = patientId || auth.currentUser?.uid;
    if (!uid) throw new Error('Patient ID required');

    const payload = sanitizeFirestoreData({
      ...consent,
      patientId: uid,
      grantedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'consents', uid), payload, { merge: true });
    const snap = await getDoc(doc(db, 'consents', uid));
    if (snap.exists()) {
      return snap.data() as PatientConsent;
    }
    return {
      id: `consent-${uid}`,
      patientId: uid,
      status: consent.status || 'active',
      purpose: consent.purpose || 'telehealth_consultation',
      organization: consent.organization || 'Metro Health System',
      scope: consent.scope || 'all_health_records',
      grantedAt: new Date().toISOString(),
      expiresAt: consent.expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      fhirConsentId: consent.fhirConsentId || `Consent-${uid}`,
    };
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
    await setDoc(doc(db, 'aiAssessments', assessment.id), sanitizeFirestoreData(assessment));
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
        const data = d.data();
        const resolvedName = data.name || data.fullName || 'User';
        users.push({
          id: d.id,
          uid: d.id,
          ...data,
          fullName: resolvedName,
          name: resolvedName,
          doctorStatus: data.role === 'doctor' ? (data.doctorStatus || 'PENDING') : undefined,
        } as UserAccount);
      });
      users.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
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
        const data = d.data();
        const resolvedName = data.name || data.fullName || 'Doctor';
        doctors.push({
          id: d.id,
          uid: d.id,
          ...data,
          fullName: resolvedName,
          name: resolvedName,
          doctorStatus: data.doctorStatus || 'PENDING',
        } as UserAccount);
      });
      doctors.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      return doctors;
    } catch (err) {
      console.error('Error fetching doctors:', err);
      return [];
    }
  },

  /**
   * Real-time listener for registered doctors.
   * Immediately notifies callback when a new doctor registers, gets approved, or gets rejected.
   */
  subscribeToDoctors(
    callback: (doctors: UserAccount[]) => void,
    onError?: (err: any) => void
  ): () => void {
    const q = query(collection(db, 'users'), where('role', '==', 'doctor'));
    return onSnapshot(
      q,
      (snap) => {
        const doctors: UserAccount[] = [];
        snap.forEach((d) => {
          const data = d.data();
          const resolvedName = data.name || data.fullName || 'Doctor';
          doctors.push({
            id: d.id,
            uid: d.id,
            ...data,
            fullName: resolvedName,
            name: resolvedName,
            doctorStatus: data.doctorStatus || 'PENDING',
          } as UserAccount);
        });
        doctors.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        callback(doctors);
      },
      (err) => {
        console.error('Error in subscribeToDoctors listener:', err);
        if (onError) onError(err);
      }
    );
  },

  /**
   * Real-time listener for all healthcare accounts.
   */
  subscribeToAllUsers(
    callback: (users: UserAccount[]) => void,
    onError?: (err: any) => void
  ): () => void {
    return onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const users: UserAccount[] = [];
        snap.forEach((d) => {
          const data = d.data();
          const resolvedName = data.name || data.fullName || 'User';
          users.push({
            id: d.id,
            uid: d.id,
            ...data,
            fullName: resolvedName,
            name: resolvedName,
            doctorStatus: data.role === 'doctor' ? (data.doctorStatus || 'PENDING') : undefined,
          } as UserAccount);
        });
        users.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        callback(users);
      },
      (err) => {
        console.error('Error in subscribeToAllUsers listener:', err);
        if (onError) onError(err);
      }
    );
  },

  async verifyDoctor(
    doctorId: string,
    status: 'APPROVED' | 'REJECTED',
    adminId?: string
  ): Promise<{ success: boolean; user: UserAccount }> {
    const nowIso = new Date().toISOString();
    await updateDoc(doc(db, 'users', doctorId), sanitizeFirestoreData({
      doctorStatus: status,
      updatedAt: nowIso,
    }));
    try {
      await updateDoc(doc(db, 'practitioners', doctorId), sanitizeFirestoreData({
        doctorStatus: status,
        updatedAt: nowIso,
      }));
    } catch (e) {
      // ignore if not present
    }

    const snap = await getDoc(doc(db, 'users', doctorId));
    const data = snap.data() || {};
    const resolvedName = data.name || data.fullName || 'Doctor';
    const updatedUser: UserAccount = {
      id: snap.id,
      uid: snap.id,
      ...data,
      fullName: resolvedName,
      name: resolvedName,
      doctorStatus: status,
    } as UserAccount;

    try {
      const auditId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      await setDoc(doc(db, 'auditEvents', auditId), sanitizeFirestoreData({
        id: auditId,
        userId: adminId || 'admin',
        userRole: 'administrator',
        userEmail: auth.currentUser?.email || '',
        action: 'VERIFY_DOCTOR',
        resourceType: 'Practitioner',
        resourceId: doctorId,
        description: `Doctor verification status updated to ${status} for ${updatedUser.fullName}`,
        timestamp: nowIso,
      }));
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
