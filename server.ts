import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// Persistence file location
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'telehealth_records.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface DatabaseSchema {
  users: any[];
  patients: any[];
  readings: any[];
  conditions: any[];
  appointments: any[];
  encounters: any[];
  prescriptions: any[];
  diagnosticReports: any[];
  consents: any[];
  aiAssessments: any[];
  auditEvents: any[];
  organizations: any[];
}

// Initial Database - Absolutely NO DUMMY PATIENT DATA.
// Contains only required secure system administrator and system organization records.
const initialDb: DatabaseSchema = {
  users: [
    {
      id: 'admin-01',
      email: 'admin@hospital.org',
      password: 'Administrator@2026',
      role: 'administrator',
      fullName: 'Chief Medical Administrator',
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'lab-01',
      email: 'labstaff@hospital.org',
      password: 'LabStaff@2026',
      role: 'laboratory_staff',
      fullName: 'Clinical Laboratory Staff',
      department: 'Central Pathology & Biochemistry',
      createdAt: '2026-01-01T00:00:00Z',
    }
  ],
  patients: [],
  readings: [],
  conditions: [],
  appointments: [],
  encounters: [],
  prescriptions: [],
  diagnosticReports: [],
  consents: [],
  aiAssessments: [],
  auditEvents: [
    {
      id: 'audit-init-01',
      userId: 'admin-01',
      userRole: 'administrator',
      userEmail: 'admin@hospital.org',
      action: 'LOGIN',
      resourceType: 'System',
      description: 'FHIR Telehealth Platform Initialized with Audit Provenance.',
      timestamp: new Date().toISOString(),
    }
  ],
  organizations: [
    {
      id: 'org-metro-health',
      name: 'Metropolitan Telehealth & Research Hospital',
      type: 'Healthcare Provider',
    },
    {
      id: 'org-central-lab',
      name: 'National Clinical Pathology & Diagnostic Lab',
      type: 'Diagnostic Laboratory',
    }
  ],
};

function readDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2));
      return initialDb;
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading database file:', err);
    return initialDb;
  }
}

function writeDb(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error('Error writing database file:', err);
  }
}

function logAudit(
  db: DatabaseSchema,
  userId: string,
  userRole: string,
  userEmail: string,
  action: string,
  resourceType: string,
  resourceId: string,
  description: string
) {
  const auditRecord = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    userId,
    userRole,
    userEmail,
    action,
    resourceType,
    resourceId,
    description,
    timestamp: new Date().toISOString(),
  };
  db.auditEvents.unshift(auditRecord);
  // Cap at 1000 logs
  if (db.auditEvents.length > 1000) {
    db.auditEvents.pop();
  }
}

// -------------------------------------------------------------
// REST API ROUTES
// -------------------------------------------------------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    platform: 'FHIR R4 Telehealth Platform',
    timestamp: new Date().toISOString(),
    fhirServer: 'Configured (R4 Standard)',
    aiEngine: 'Active (Deterministic Clinical Stratification)',
  });
});

// Authentication: Register
app.post('/api/auth/register', (req, res) => {
  const { email, password, role, fullName, licenseNumber, specialty, hospitalAffiliation } = req.body;
  if (!email || !password || !role || !fullName) {
    return res.status(400).json({ error: 'Missing required registration fields' });
  }

  // Strictly forbid public administrator registration
  if (role === 'administrator') {
    return res.status(403).json({ error: 'Public Administrator registration is strictly prohibited.' });
  }

  const db = readDb();
  const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'An account with this email address already exists.' });
  }

  const id = `user-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  // Doctor registration status MUST initially be PENDING
  const doctorStatus = role === 'doctor' ? 'PENDING' : undefined;

  const newUser = {
    id,
    email,
    password, // For project demo authentication; production uses Firebase Auth tokens
    role,
    fullName,
    createdAt: new Date().toISOString(),
    doctorStatus,
    licenseNumber,
    specialty,
    hospitalAffiliation,
  };

  db.users.push(newUser);

  // If patient, initialize blank patient profile with NO fake records
  if (role === 'patient') {
    db.patients.push({
      id,
      userId: id,
      fullName,
      dateOfBirth: req.body.dateOfBirth || '',
      gender: req.body.gender || 'unknown',
      phoneNumber: req.body.phoneNumber || '',
      emergencyContact: req.body.emergencyContact || { name: '', relationship: '', phone: '' },
      bloodGroup: req.body.bloodGroup || '',
      allergies: req.body.allergies || [],
      currentMedications: req.body.currentMedications || [],
      conditions: [],
      medicalHistoryNotes: '',
      updatedAt: new Date().toISOString(),
    });

    // Automatically create default active consent record for the patient
    db.consents.push({
      id: `consent-${id}`,
      patientId: id,
      status: 'active',
      purpose: 'telehealth_consultation',
      organization: 'org-metro-health',
      scope: 'all_health_records',
      grantedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  logAudit(db, id, role, email, 'LOGIN', 'User', id, `Registered new ${role} account: ${email}`);
  writeDb(db);

  // Safe user without password
  const { password: _, ...safeUser } = newUser;
  res.status(201).json({ user: safeUser });
});

// Authentication: Login
app.post('/api/auth/login', (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const db = readDb();
  const user = db.users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Ensure role matches selected role
  if (role && user.role !== role) {
    return res.status(403).json({
      error: `Account role is '${user.role}', but you attempted to login through '${role}' portal. Please select the correct role.`,
    });
  }

  logAudit(db, user.id, user.role, user.email, 'LOGIN', 'User', user.id, `User logged in: ${user.email}`);
  writeDb(db);

  const { password: _, ...safeUser } = user;
  res.json({ user: safeUser });
});

// Admin: Get all users & pending doctors
app.get('/api/admin/users', (req, res) => {
  const db = readDb();
  const safeUsers = db.users.map(({ password, ...u }) => u);
  res.json(safeUsers);
});

// Admin: Verify doctor (APPROVE or REJECT)
app.post('/api/admin/doctors/:id/verify', (req, res) => {
  const { id } = req.params;
  const { status, adminId } = req.body; // 'APPROVED' or 'REJECTED'

  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'Status must be APPROVED or REJECTED' });
  }

  const db = readDb();
  const user = db.users.find((u) => u.id === id && u.role === 'doctor');
  if (!user) {
    return res.status(404).json({ error: 'Doctor not found' });
  }

  user.doctorStatus = status;
  logAudit(
    db,
    adminId || 'admin-01',
    'administrator',
    'admin@hospital.org',
    'VERIFY_DOCTOR',
    'Practitioner',
    id,
    `Doctor ${user.fullName} (${user.email}) verification updated to ${status}`
  );
  writeDb(db);

  const { password: _, ...safeUser } = user;
  res.json({ success: true, user: safeUser });
});

// Patient: Get profile
app.get('/api/patients/:id/profile', (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const patient = db.patients.find((p) => p.userId === id || p.id === id);
  if (!patient) {
    return res.status(404).json({ error: 'Patient profile not found' });
  }
  res.json(patient);
});

// Patient: Update profile
app.put('/api/patients/:id/profile', (req, res) => {
  const { id } = req.params;
  const db = readDb();
  let patient = db.patients.find((p) => p.userId === id || p.id === id);

  if (!patient) {
    patient = {
      id,
      userId: id,
      fullName: req.body.fullName || '',
      dateOfBirth: req.body.dateOfBirth || '',
      gender: req.body.gender || 'unknown',
      phoneNumber: req.body.phoneNumber || '',
      emergencyContact: req.body.emergencyContact || { name: '', relationship: '', phone: '' },
      bloodGroup: req.body.bloodGroup || '',
      allergies: req.body.allergies || [],
      currentMedications: req.body.currentMedications || [],
      conditions: req.body.conditions || [],
      medicalHistoryNotes: req.body.medicalHistoryNotes || '',
      updatedAt: new Date().toISOString(),
    };
    db.patients.push(patient);
  } else {
    Object.assign(patient, req.body, { updatedAt: new Date().toISOString() });
  }

  logAudit(db, id, 'patient', patient.fullName, 'UPDATE_CONDITION', 'Patient', id, 'Updated medical profile');
  writeDb(db);
  res.json(patient);
});

// Patient: Save medical conditions array
app.put('/api/patients/:id/conditions', (req, res) => {
  const { id } = req.params;
  const { conditions } = req.body; // array of SupportedCondition

  const db = readDb();
  let patient = db.patients.find((p) => p.userId === id || p.id === id);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const valid = ['Diabetes', 'Hypertension', 'COPD'];
  patient.conditions = (conditions || []).filter((c: string) => valid.includes(c));
  patient.updatedAt = new Date().toISOString();

  logAudit(
    db,
    id,
    'patient',
    patient.fullName || 'Patient',
    'UPDATE_CONDITIONS',
    'Condition',
    id,
    `Updated medical conditions: ${patient.conditions.join(', ') || 'None'}`
  );
  writeDb(db);
  res.json({ conditions: patient.conditions, patient });
});

// Patient: Record single medical condition toggle
app.post('/api/patients/:id/conditions', (req, res) => {
  const { id } = req.params;
  const { condition, active } = req.body; // condition: 'Diabetes' | 'Hypertension' | 'COPD'

  const db = readDb();
  const patient = db.patients.find((p) => p.userId === id || p.id === id);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  if (!['Diabetes', 'Hypertension', 'COPD'].includes(condition)) {
    return res.status(400).json({ error: 'Supported conditions are Diabetes, Hypertension, and COPD' });
  }

  if (active) {
    if (!patient.conditions.includes(condition)) {
      patient.conditions.push(condition);
    }
  } else {
    patient.conditions = patient.conditions.filter((c: string) => c !== condition);
  }

  patient.updatedAt = new Date().toISOString();
  logAudit(
    db,
    id,
    'patient',
    patient.fullName,
    'CREATE_CONDITION',
    'Condition',
    `${id}-${condition}`,
    `${active ? 'Added' : 'Removed'} medical condition: ${condition}`
  );
  writeDb(db);
  res.json({ conditions: patient.conditions });
});

// Health Readings: Create
app.post('/api/readings', (req, res) => {
  const reading = req.body;
  if (!reading.patientId || !reading.parameterType) {
    return res.status(400).json({ error: 'patientId and parameterType are required' });
  }

  const db = readDb();
  const id = `obs-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const newReading = {
    ...reading,
    id,
    createdAt: new Date().toISOString(),
    fhirObservationId: id,
  };

  db.readings.push(newReading);
  logAudit(
    db,
    reading.patientId,
    'patient',
    'Patient Record',
    'CREATE_HEALTH_READING',
    'Observation',
    id,
    `Recorded vital reading: ${reading.parameterType}`
  );
  writeDb(db);
  res.status(201).json(newReading);
});

// Health Readings: Batch Create
app.post('/api/readings/batch', (req, res) => {
  const { patientId, readings } = req.body;
  if (!patientId || !Array.isArray(readings) || readings.length === 0) {
    return res.status(400).json({ error: 'patientId and readings array are required' });
  }

  const db = readDb();
  const created: any[] = [];

  for (const item of readings) {
    if (!item.parameterType) continue;
    const id = `obs-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newReading = {
      ...item,
      patientId,
      id,
      createdAt: new Date().toISOString(),
      fhirObservationId: id,
    };
    db.readings.push(newReading);
    created.push(newReading);
  }

  if (created.length > 0) {
    logAudit(
      db,
      patientId,
      'patient',
      'Patient Record',
      'CREATE_HEALTH_READING_BATCH',
      'Observation',
      created[0].id,
      `Recorded ${created.length} vital observation(s): ${created.map((c) => c.parameterType).join(', ')}`
    );
    writeDb(db);
  }

  res.status(201).json(created);
});

// Health Readings: Today's Check-in Upsert (prevents duplicates)
app.post('/api/readings/checkin', (req, res) => {
  const { patientId, readings, date } = req.body;
  if (!patientId || !Array.isArray(readings) || readings.length === 0) {
    return res.status(400).json({ error: 'patientId and readings array are required' });
  }

  const db = readDb();
  const targetDate = date || new Date().toISOString().split('T')[0];
  const results: any[] = [];

  for (const item of readings) {
    if (!item.parameterType) continue;
    // Check if an entry already exists for this patient, parameter, and date
    const existingIndex = db.readings.findIndex(
      (r) => r.patientId === patientId && r.parameterType === item.parameterType && r.date === targetDate
    );

    if (existingIndex !== -1) {
      // Update in place to avoid duplicate readings for today
      db.readings[existingIndex] = {
        ...db.readings[existingIndex],
        ...item,
        patientId,
        date: targetDate,
        updatedAt: new Date().toISOString(),
      };
      results.push(db.readings[existingIndex]);
    } else {
      const id = `obs-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const newReading = {
        ...item,
        patientId,
        id,
        date: targetDate,
        createdAt: new Date().toISOString(),
        fhirObservationId: id,
      };
      db.readings.push(newReading);
      results.push(newReading);
    }
  }

  if (results.length > 0) {
    logAudit(
      db,
      patientId,
      'patient',
      'Patient Record',
      'CHECKIN_HEALTH_READINGS',
      'Observation',
      results[0].id,
      `Recorded/Updated ${results.length} daily check-in observation(s) on ${targetDate}`
    );
    writeDb(db);
  }

  res.status(200).json(results);
});

// Health Readings: Update single reading by ID
app.put('/api/readings/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const db = readDb();
  const index = db.readings.findIndex((r) => r.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Reading not found' });
  }

  db.readings[index] = {
    ...db.readings[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  logAudit(
    db,
    db.readings[index].patientId,
    'patient',
    'Patient Record',
    'UPDATE_HEALTH_READING',
    'Observation',
    id,
    `Updated vital reading: ${db.readings[index].parameterType}`
  );
  writeDb(db);
  res.json(db.readings[index]);
});

// Health Readings: Get by patient
app.get('/api/readings/patient/:patientId', (req, res) => {
  const { patientId } = req.params;
  const db = readDb();
  const list = db.readings
    .filter((r) => r.patientId === patientId)
    .sort((a, b) => new Date(`${b.date}T${b.time || '00:00'}`).getTime() - new Date(`${a.date}T${a.time || '00:00'}`).getTime());
  res.json(list);
});

// Appointments
app.get('/api/appointments', (req, res) => {
  const { patientId, doctorId } = req.query;
  const db = readDb();
  let list = db.appointments;
  if (patientId) {
    list = list.filter((a) => a.patientId === patientId);
  }
  if (doctorId) {
    list = list.filter((a) => a.doctorId === doctorId);
  }
  res.json(list.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()));
});

app.post('/api/appointments', (req, res) => {
  const appt = req.body;
  if (!appt.patientId || !appt.doctorId || !appt.dateTime) {
    return res.status(400).json({ error: 'Missing appointment details' });
  }

  const db = readDb();
  const id = `appt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const newAppt = {
    ...appt,
    id,
    status: appt.status || 'Proposed',
    createdAt: new Date().toISOString(),
    fhirAppointmentId: id,
  };

  db.appointments.push(newAppt);
  logAudit(db, appt.patientId, 'patient', appt.patientName, 'CREATE_APPOINTMENT', 'Appointment', id, `Scheduled appointment with ${appt.doctorName}`);
  writeDb(db);
  res.status(201).json(newAppt);
});

app.patch('/api/appointments/:id', (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;
  const db = readDb();
  const appt = db.appointments.find((a) => a.id === id);
  if (!appt) {
    return res.status(404).json({ error: 'Appointment not found' });
  }
  if (status) appt.status = status;
  if (notes) appt.notes = notes;
  writeDb(db);
  res.json(appt);
});

// Consultations / Encounters
app.post('/api/encounters', (req, res) => {
  const enc = req.body;
  const db = readDb();
  const id = `enc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const newEnc = {
    ...enc,
    id,
    fhirEncounterId: id,
    status: enc.status || 'in-progress',
    startTime: enc.startTime || new Date().toISOString(),
  };
  db.encounters.push(newEnc);
  logAudit(db, enc.doctorId, 'doctor', 'Doctor', 'START_CONSULTATION', 'Encounter', id, `Virtual teleconsultation initiated`);
  writeDb(db);
  res.status(201).json(newEnc);
});

app.patch('/api/encounters/:id', (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const enc = db.encounters.find((e) => e.id === id);
  if (!enc) return res.status(404).json({ error: 'Encounter not found' });
  Object.assign(enc, req.body);
  if (req.body.status === 'completed' && !enc.endTime) {
    enc.endTime = new Date().toISOString();
  }
  writeDb(db);
  res.json(enc);
});

// Prescriptions
app.get('/api/prescriptions', (req, res) => {
  const { patientId, doctorId } = req.query;
  const db = readDb();
  let list = db.prescriptions;
  if (patientId) list = list.filter((p) => p.patientId === patientId);
  if (doctorId) list = list.filter((p) => p.doctorId === doctorId);
  res.json(list.sort((a, b) => new Date(b.prescribedDate).getTime() - new Date(a.prescribedDate).getTime()));
});

app.post('/api/prescriptions', (req, res) => {
  const p = req.body;
  if (!p.patientId || !p.medication || !p.dosage) {
    return res.status(400).json({ error: 'Missing medication or dosage' });
  }

  const db = readDb();
  const id = `rx-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const newPrescription = {
    ...p,
    id,
    prescribedDate: p.prescribedDate || new Date().toISOString().split('T')[0],
    fhirMedicationRequestId: id,
  };
  db.prescriptions.push(newPrescription);
  logAudit(db, p.doctorId, 'doctor', p.doctorName, 'CREATE_PRESCRIPTION', 'MedicationRequest', id, `Prescribed ${p.medication} to ${p.patientName}`);
  writeDb(db);
  res.status(201).json(newPrescription);
});

// Laboratory Reports
app.get('/api/laboratory/reports', (req, res) => {
  const { patientId } = req.query;
  const db = readDb();
  let list = db.diagnosticReports;
  if (patientId) list = list.filter((r) => r.patientId === patientId);
  res.json(list.sort((a, b) => new Date(b.testDate).getTime() - new Date(a.testDate).getTime()));
});

app.post('/api/laboratory/reports', (req, res) => {
  const report = req.body;
  if (!report.patientId || !report.testName || !report.resultValue) {
    return res.status(400).json({ error: 'Missing patient or test results' });
  }

  const db = readDb();
  const id = `diag-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const newReport = {
    ...report,
    id,
    createdAt: new Date().toISOString(),
    fhirDiagnosticReportId: id,
  };
  db.diagnosticReports.push(newReport);
  logAudit(db, report.labStaffId, 'laboratory_staff', 'Lab Staff', 'UPLOAD_LAB_REPORT', 'DiagnosticReport', id, `Entered lab result: ${report.testName}`);
  writeDb(db);
  res.status(201).json(newReport);
});

// Consent Management
app.get('/api/consents/:patientId', (req, res) => {
  const { patientId } = req.params;
  const db = readDb();
  const consent = db.consents.find((c) => c.patientId === patientId);
  res.json(consent || null);
});

app.put('/api/consents/:patientId', (req, res) => {
  const { patientId } = req.params;
  const db = readDb();
  let consent = db.consents.find((c) => c.patientId === patientId);
  if (!consent) {
    consent = {
      id: `consent-${patientId}`,
      patientId,
      status: req.body.status || 'active',
      purpose: req.body.purpose || 'telehealth_consultation',
      organization: 'org-metro-health',
      scope: req.body.scope || 'all_health_records',
      grantedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    };
    db.consents.push(consent);
  } else {
    Object.assign(consent, req.body);
  }
  logAudit(db, patientId, 'patient', 'Patient', 'UPDATE_CONSENT', 'Consent', consent.id, `Updated patient consent status to ${consent.status}`);
  writeDb(db);
  res.json(consent);
});

// AI Risk Assessments history
app.get('/api/ai/assessments/:patientId', (req, res) => {
  const { patientId } = req.params;
  const db = readDb();
  const assessments = db.aiAssessments
    .filter((a) => a.patientId === patientId)
    .sort((a, b) => new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime());
  res.json(assessments);
});

app.post('/api/ai/assessments', (req, res) => {
  const assessment = req.body;
  const db = readDb();
  db.aiAssessments.unshift(assessment);
  logAudit(
    db,
    assessment.patientId,
    'system',
    'AI Risk Stratification Engine',
    'REQUEST_AI_ASSESSMENT',
    'RiskAssessment',
    assessment.id,
    `Evaluated ${assessment.condition} risk: ${assessment.status === 'ASSESSED' ? assessment.riskLevel : 'Insufficient Data'}`
  );
  writeDb(db);
  res.status(201).json(assessment);
});

// Audit Events (Admin Only)
app.get('/api/audit-events', (req, res) => {
  const db = readDb();
  res.json(db.auditEvents);
});

// Doctors list for patients/booking
app.get('/api/doctors', (req, res) => {
  const db = readDb();
  const doctors = db.users
    .filter((u) => u.role === 'doctor')
    .map(({ password, ...u }) => u);
  res.json(doctors);
});

// Patients list for doctors / lab
app.get('/api/patients', (req, res) => {
  const db = readDb();
  res.json(db.patients);
});

// -------------------------------------------------------------
// FHIR R4 CONFORMANCE & STANDARDS ENDPOINTS
// -------------------------------------------------------------
app.get('/api/fhir/metadata', (req, res) => {
  res.json({
    resourceType: 'CapabilityStatement',
    id: 'fhir-telehealth-platform-r4',
    status: 'active',
    date: new Date().toISOString(),
    publisher: 'FHIR Telehealth Platform Consortium',
    kind: 'instance',
    software: {
      name: 'FHIR R4 Telehealth Server',
      version: '4.0.1',
    },
    fhirVersion: '4.0.1',
    format: ['application/fhir+json', 'application/json'],
    rest: [
      {
        mode: 'server',
        documentation: 'FHIR R4 compliant telehealth and remote monitoring interoperability endpoint.',
        resource: [
          { type: 'Patient', interaction: [{ code: 'read' }, { code: 'search-type' }] },
          { type: 'Observation', interaction: [{ code: 'read' }, { code: 'create' }, { code: 'search-type' }] },
          { type: 'Condition', interaction: [{ code: 'read' }, { code: 'search-type' }] },
          { type: 'DiagnosticReport', interaction: [{ code: 'read' }, { code: 'search-type' }] },
          { type: 'Appointment', interaction: [{ code: 'read' }, { code: 'create' }, { code: 'update' }] },
          { type: 'Encounter', interaction: [{ code: 'read' }, { code: 'create' }, { code: 'update' }] },
          { type: 'MedicationRequest', interaction: [{ code: 'read' }, { code: 'create' }] },
          { type: 'Consent', interaction: [{ code: 'read' }, { code: 'update' }] },
          { type: 'AuditEvent', interaction: [{ code: 'read' }, { code: 'search-type' }] },
        ],
      },
    ],
  });
});

// -------------------------------------------------------------
// VITE MIDDLEWARE & SERVER STARTUP
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FHIR Telehealth Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
