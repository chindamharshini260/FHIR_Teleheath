import React, { useState } from 'react';
import { UserRole, UserAccount, normalizeRole } from '../../types';
import { api } from '../../lib/api';
import { ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AuthPortalProps {
  role: UserRole;
  onBackToRoles: () => void;
  onLoginSuccess: (user: UserAccount) => void;
}

export const AuthPortal: React.FC<AuthPortalProps> = ({ role, onBackToRoles, onLoginSuccess }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  // Patient fields
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | 'unknown'>('male');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  // Doctor fields
  const [licenseNumber, setLicenseNumber] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [hospitalAffiliation, setHospitalAffiliation] = useState('');
  // Lab fields
  const [department, setDepartment] = useState('');
  // Admin passkey
  const [adminPasskey, setAdminPasskey] = useState('admin_telehealth_secure_key_2026');

  // UI status
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const effectiveRole = normalizeRole(role);

  const getRoleTitle = () => {
    switch (effectiveRole) {
      case 'patient':
        return 'Patient';
      case 'doctor':
        return 'Doctor';
      case 'lab':
        return 'Laboratory Staff';
      case 'admin':
        return 'Administrator';
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const res = await api.login({ email, password, role: effectiveRole });
      onLoginSuccess(res.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (effectiveRole === 'admin') {
        if (adminPasskey !== 'admin_telehealth_secure_key_2026') {
          throw new Error('Invalid Administrator Passkey. Authorization denied.');
        }
      }

      const res = await api.register({
        email,
        password,
        role: effectiveRole,
        fullName,
        dateOfBirth: dob,
        gender,
        phoneNumber,
        licenseNumber: effectiveRole === 'doctor' ? licenseNumber : undefined,
        specialty: effectiveRole === 'doctor' ? specialty : undefined,
        hospitalAffiliation: effectiveRole === 'doctor' ? hospitalAffiliation : undefined,
        department: effectiveRole === 'lab' ? department : undefined,
      });

      onLoginSuccess(res.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const res = await api.loginWithGoogle(effectiveRole);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }
    setSuccessMessage(`Password recovery instructions sent to ${email}.`);
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-xs border border-slate-200">
        {/* Back link */}
        <button
          onClick={onBackToRoles}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to roles
        </button>

        {/* Role Name and Welcome Back */}
        <div className="text-center mb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
            {getRoleTitle()}
          </span>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">
            Welcome Back
          </h2>
        </div>

        {/* Error / Success Feedback */}
        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-amber-950">
                  {errorMessage.includes('operation-not-allowed') || errorMessage.includes('Email/Password')
                    ? 'Firebase Console Action Required'
                    : 'Authentication Alert'}
                </p>
                <p className="mt-0.5 text-amber-800 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
            {(errorMessage.includes('operation-not-allowed') || errorMessage.includes('Email/Password')) && (
              <div className="bg-white p-3 rounded border border-amber-200 mt-1">
                <p className="font-semibold text-slate-800 mb-1.5">
                  How to enable Email/Password in Firebase Console:
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-700 text-[11px] leading-relaxed">
                  <li>
                    Open{' '}
                    <a
                      href="https://console.firebase.google.com/project/fhir-e1670/authentication/providers"
                      target="_blank"
                      rel="noreferrer"
                      className="text-teal-700 underline font-semibold hover:text-teal-900"
                    >
                      Firebase Console &gt; Authentication &gt; Sign-in method (fhir-e1670)
                    </a>
                  </li>
                  <li>Under <strong>Native providers</strong>, select <strong>Email/Password</strong></li>
                  <li>Switch the top <strong>Enable</strong> toggle to ON</li>
                  <li>Click <strong>Save</strong></li>
                </ol>
                <p className="mt-2 text-[11px] text-slate-500 italic">
                  Once enabled, Email/Password login and registration will work immediately without restarting. You can also click "Sign in with Google" below right now.
                </p>
              </div>
            )}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* LOGIN VIEW */}
        {authMode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end text-xs">
              <button
                type="button"
                onClick={() => setAuthMode('forgot')}
                className="text-teal-700 hover:text-teal-800 font-medium"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg text-sm font-bold tracking-wide text-white bg-slate-900 hover:bg-teal-700 transition-colors disabled:opacity-50 uppercase cursor-pointer"
            >
              {loading ? 'Authenticating...' : 'LOGIN'}
            </button>

            {/* Google Authentication Option */}
            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500 font-medium">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Sign in with Google
            </button>

            {/* Register if applicable */}
            {(effectiveRole === 'patient' || effectiveRole === 'doctor' || effectiveRole === 'lab' || effectiveRole === 'admin') && (
              <div className="text-center pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-600">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register');
                      setErrorMessage('');
                    }}
                    className="font-semibold text-teal-700 hover:underline"
                  >
                    Register
                  </button>
                </p>
              </div>
            )}
          </form>
        )}

        {/* REGISTRATION VIEW (PATIENT & DOCTOR) */}
        {authMode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={effectiveRole === 'doctor' ? 'Dr. Jane Smith' : 'John Doe'}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none"
              />
            </div>

            {/* Patient Specific Fields */}
            {effectiveRole === 'patient' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      required
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Gender
                    </label>
                    <select
                      value={gender}
                      onChange={(e: any) => setGender(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="unknown">Unknown</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none"
                  />
                </div>
              </>
            )}

            {/* Doctor Specific Fields */}
            {effectiveRole === 'doctor' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Medical License Number (NPI / State ID)
                  </label>
                  <input
                    type="text"
                    required
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="NPI-9923841029"
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Specialty
                    </label>
                    <input
                      type="text"
                      required
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      placeholder="e.g. Cardiology"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Hospital Affiliation
                    </label>
                    <input
                      type="text"
                      required
                      value={hospitalAffiliation}
                      onChange={(e) => setHospitalAffiliation(e.target.value)}
                      placeholder="e.g. City Hospital"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Laboratory Staff Specific Fields */}
            {effectiveRole === 'lab' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department / Specialty
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Pathology & Diagnostics"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none"
                />
              </div>
            )}

            {/* Administrator Specific Field */}
            {effectiveRole === 'admin' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Administrative Passkey
                </label>
                <input
                  type="password"
                  value={adminPasskey}
                  onChange={(e) => setAdminPasskey(e.target.value)}
                  placeholder="Enter administrator passkey"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Governance security verification key required for hospital administrator accounts.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-lg text-sm font-bold text-white bg-slate-900 hover:bg-teal-700 transition-colors disabled:opacity-50 uppercase cursor-pointer"
            >
              {loading ? 'Registering...' : 'REGISTER'}
            </button>

            {/* Google Authentication Option */}
            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500 font-medium">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Sign up with Google
            </button>

            <div className="text-center pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-600">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMessage('');
                  }}
                  className="font-semibold text-teal-700 hover:underline"
                >
                  Login
                </button>
              </p>
            </div>
          </form>
        )}

        {/* FORGOT PASSWORD VIEW */}
        {authMode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-slate-900 hover:bg-teal-700 transition-colors"
            >
              Reset Password
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 underline"
              >
                Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
