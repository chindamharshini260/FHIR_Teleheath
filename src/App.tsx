import React, { useState, useEffect } from 'react';
import { UserRole, UserAccount } from './types';
import { Navbar } from './components/common/Navbar';
import { RoleSelection } from './components/auth/RoleSelection';
import { AuthPortal } from './components/auth/AuthPortal';
import { PatientDashboard } from './components/patient/PatientDashboard';
import { DoctorDashboard } from './components/doctor/DoctorDashboard';
import { LabDashboard } from './components/lab/LabDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { api } from './lib/api';

export default function App() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Restore session via Firebase Auth and Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userSnap.exists()) {
            const user = userSnap.data() as UserAccount;
            setCurrentUser(user);
            setSelectedRole(user.role);
          }
        } catch (e) {
          console.warn('Could not restore Firestore user session:', e);
        }
      } else {
        setCurrentUser(null);
        setSelectedRole(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role);
  };

  const handleBackToRoles = () => {
    setSelectedRole(null);
  };

  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    setSelectedRole(user.role);
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (e) {
      console.warn('Logout error:', e);
    }
    setCurrentUser(null);
    setSelectedRole(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-medium">Connecting to telehealth platform...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-teal-100 selection:text-teal-900">
      {/* Top Universal Navbar - Suppressed for Patient role as Patient uses dedicated Left Sidebar */}
      {currentUser?.role !== 'patient' && (
        <Navbar
          currentUser={currentUser}
          onLogout={handleLogout}
          onSwitchRole={handleLogout}
        />
      )}

      {/* Main Content Router */}
      <main className="flex-1">
        {!currentUser ? (
          /* Authentication & Role Selection Flow */
          !selectedRole ? (
            <RoleSelection onSelectRole={handleSelectRole} />
          ) : (
            <AuthPortal
              role={selectedRole}
              onBackToRoles={handleBackToRoles}
              onLoginSuccess={handleLoginSuccess}
            />
          )
        ) : (
          /* Role-Protected Real Dashboards */
          <>
            {currentUser.role === 'patient' && (
              <PatientDashboard user={currentUser} onLogout={handleLogout} />
            )}
            {currentUser.role === 'doctor' && <DoctorDashboard user={currentUser} />}
            {currentUser.role === 'laboratory_staff' && <LabDashboard user={currentUser} />}
            {currentUser.role === 'administrator' && <AdminDashboard user={currentUser} />}
          </>
        )}
      </main>

      {/* System Footer - Hidden for patient sidebar layout */}
      {currentUser?.role !== 'patient' && (
        <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>
              HL7 FHIR R4 Compliant Telehealth Platform • Remote Vital Monitoring &amp; Disease Risk Stratification
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              CapabilityStatement: 4.0.1 • LOINC &amp; SNOMED CT
            </span>
          </div>
        </footer>
      )}
    </div>
  );
}
