'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

// Authentication with a mobile number:
//   login  – mobile number + password (no SMS is sent); used by customers, vendors and the admin
//   signup – mobile number → one OTP → name + password
//   reset  – forgot password: mobile number → one OTP → new password
// Each screen renders its own fields and calls `submit` from its form.
export default function useMobileAuth({ onSuccess } = {}) {
  const { login, sendOtp, loginWithOtp } = useAuth();
  const [mode, setModeState] = useState('login');
  const [phone, setPhoneState] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtpState] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const digits = phone.replace(/\D/g, '');
  const mobile = digits.length === 12 && digits.startsWith('91') ? digits.slice(2)
    : digits.length === 11 && digits.startsWith('0') ? digits.slice(1)
    : digits;
  const isValidMobile = /^[6-9]\d{9}$/.test(mobile);

  const clearStep = () => {
    setOtpSent(false);
    setOtpState('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setInfo('');
  };

  // Switching between login / sign-up / forgot password keeps the number the user typed
  const setMode = (next) => {
    setModeState(next);
    setName('');
    clearStep();
  };

  // Changing the number starts the OTP step over
  const setPhone = (value) => {
    setPhoneState(value);
    if (otpSent) clearStep();
  };
  const setOtp = (value) => setOtpState(String(value).replace(/\D/g, '').slice(0, 8));

  const requestOtp = async () => {
    setError('');
    setInfo('');
    if (!isValidMobile) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setBusy(true);
    const res = await sendOtp(mobile, mode === 'reset' ? 'reset' : 'signup');
    setBusy(false);
    if (res?.success) {
      setOtpSent(true);
      setOtpState('');
      setInfo(`OTP sent to +91 ${mobile}`);
    } else {
      setError(res?.error || 'Could not send OTP. Please try again.');
    }
  };

  const finish = (user) => {
    localStorage.setItem('show_notification_prompt', 'true');
    onSuccess?.(user);
  };

  // Everyone logs in here: customers, vendors and the admin (the .env number + password gives admin access).
  // An email is also accepted, so accounts without a mobile number (or an admin without ADMIN_PHONE) still get in.
  const doLogin = async () => {
    const typedEmail = phone.includes('@') ? phone.trim() : '';
    if (!typedEmail && !isValidMobile) return setError('Please enter a valid 10-digit mobile number.');
    if (!password) return setError('Please enter your password.');
    setBusy(true);
    const res = await login(typedEmail || mobile, password);
    setBusy(false);
    if (res?.success) finish(res.user);
    else setError(res?.error || 'Invalid mobile number or password.');
  };

  const verifyAndSetPassword = async () => {
    if (!/^\d{4,8}$/.test(otp)) return setError('Please enter the OTP sent to your mobile.');
    if (mode === 'signup' && !name.trim()) return setError('Please enter your name.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    setBusy(true);
    const res = await loginWithOtp(mobile, otp, { purpose: mode, name: name.trim(), password });
    setBusy(false);
    if (res?.success) finish(res.user);
    else setError(res?.error || 'Could not verify the OTP.');
  };

  // Form submit: login, or (sign-up / reset) first send the OTP, then verify it with the password
  const submit = async (e) => {
    e?.preventDefault?.();
    if (busy) return;
    setError('');
    if (mode === 'login') await doLogin();
    else if (!otpSent) await requestOtp();
    else await verifyAndSetPassword();
  };

  const reset = () => {
    setModeState('login');
    setPhoneState('');
    setName('');
    clearStep();
  };

  const title = mode === 'signup' ? 'Create Account' : mode === 'reset' ? 'Reset Password' : 'Welcome Back';
  const subtitle = mode === 'signup'
    ? (otpSent ? 'Enter the OTP, your name and a password for your account.' : 'Enter your mobile number. We will send a one-time OTP to verify it.')
    : mode === 'reset'
      ? (otpSent ? 'Enter the OTP and choose a new password.' : 'Enter your registered mobile number to get an OTP.')
      : 'Log in with your mobile number and password.';
  const submitLabel = busy ? 'Please wait...'
    : mode === 'login' ? 'Log In'
    : !otpSent ? 'Send OTP'
    : mode === 'signup' ? 'Verify & Create Account' : 'Verify & Set Password';
  // Password fields: always for login, after the OTP for sign-up / reset
  const showPassword = mode === 'login' || otpSent;
  const showConfirm = mode !== 'login' && otpSent;

  return {
    mode, setMode, phone, setPhone, password, setPassword, confirmPassword, setConfirmPassword,
    name, setName, otp, setOtp, otpSent, busy, error, info,
    submit, resend: requestOtp, reset, title, subtitle, submitLabel, showPassword, showConfirm,
  };
}
