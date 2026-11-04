// Login page (app/(auth)/login/page.jsx with hooks/useMobileAuth.js): mobile number + password, OTP login,
// sign-up and forgot password. The form is redrawn when its fields change; typed values are kept in state.
(function () {
  const { animate } = window.Motion;
  const D = window.Daivika;
  const ICONS = window.DaivikaIcons;
  const esc = D.esc;
  const svg = (name, size, { cls = '', style = '' } = {}) => {
    const i = ICONS[name];
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${i.cls}${cls ? ' ' + cls : ''}" aria-hidden="true"${style ? ` style="${style}"` : ''}>${i.inner}</svg>`;
  };

  const box = document.querySelector('[data-login]');
  const form = box.querySelector('[data-login-form]');
  const s = { mode: 'login', phone: '', password: '', confirm: '', name: '', otp: '', otpSent: false, busy: false, error: '', info: '', showPassword: false, transitioning: false };

  const mobile = () => {
    const d = s.phone.replace(/\D/g, '');
    return d.length === 12 && d.startsWith('91') ? d.slice(2) : d.length === 11 && d.startsWith('0') ? d.slice(1) : d;
  };
  const validMobile = () => /^[6-9]\d{9}$/.test(mobile());
  const clearStep = () => Object.assign(s, { otpSent: false, otp: '', password: '', confirm: '', error: '', info: '' });
  const setMode = (m) => { s.mode = m; s.name = ''; clearStep(); };

  // Where each kind of account goes after logging in
  const home = (u) => (u && (u.role === 'admin' || u.role === 'staff') ? '/admin/dashboard' : u && u.role === 'vendor' ? '/vendor/dashboard' : '/');
  const finish = (user) => { localStorage.setItem('show_notification_prompt', 'true'); location.href = home(user); };
  D.on('auth', (a) => { if (a.user) location.href = home(a.user); });

  async function requestOtp() {
    s.error = ''; s.info = '';
    if (!validMobile()) { s.error = 'Please enter a valid 10-digit mobile number.'; return; }
    s.busy = true; draw();
    const res = await D.auth.sendOtp(mobile(), s.mode === 'reset' ? 'reset' : s.mode === 'otp' ? 'login' : 'signup');
    s.busy = false;
    if (res && res.success) { s.otpSent = true; s.otp = ''; s.info = `OTP sent to +91 ${mobile()}`; }
    else s.error = (res && res.error) || 'Could not send OTP. Please try again.';
  }
  async function doLogin() {
    const email = s.phone.includes('@') ? s.phone.trim() : '';
    if (!email && !validMobile()) { s.error = 'Please enter a valid 10-digit mobile number.'; return; }
    if (!s.password) { s.error = 'Please enter your password.'; return; }
    s.busy = true; draw();
    const res = await D.auth.login(email || mobile(), s.password);
    s.busy = false;
    if (res && res.success) finish(res.user); else s.error = (res && res.error) || 'Invalid mobile number or password.';
  }
  async function verifyAndLogin() {
    if (!/^\d{4,8}$/.test(s.otp)) { s.error = 'Please enter the OTP sent to your mobile.'; return; }
    s.busy = true; draw();
    const res = await D.auth.loginWithOtp(mobile(), s.otp, { purpose: 'login' });
    s.busy = false;
    if (res && res.success) finish(res.user); else s.error = (res && res.error) || 'Could not verify the OTP.';
  }
  async function verifyAndSetPassword() {
    if (!/^\d{4,8}$/.test(s.otp)) { s.error = 'Please enter the OTP sent to your mobile.'; return; }
    if (s.mode === 'signup' && !s.name.trim()) { s.error = 'Please enter your name.'; return; }
    if (s.password.length < 6) { s.error = 'Password must be at least 6 characters.'; return; }
    if (s.password !== s.confirm) { s.error = 'Passwords do not match.'; return; }
    s.busy = true; draw();
    const res = await D.auth.loginWithOtp(mobile(), s.otp, { purpose: s.mode, name: s.name.trim(), password: s.password });
    s.busy = false;
    if (res && res.success) finish(res.user); else s.error = (res && res.error) || 'Could not verify the OTP.';
  }
  async function submit() {
    if (s.busy) return;
    s.error = '';
    if (s.mode === 'login') await doLogin();
    else if (!s.otpSent) await requestOtp();
    else if (s.mode === 'otp') await verifyAndLogin();
    else await verifyAndSetPassword();
    draw();
  }

  const text = () => {
    const m = s.mode, sent = s.otpSent;
    const title = m === 'signup' ? 'Create Account' : m === 'reset' ? 'Reset Password' : 'Welcome Back';
    const otpSub = sent ? 'Enter the OTP we sent to your mobile.' : 'Enter your registered mobile number to get an OTP.';
    const subtitle = m === 'otp' ? otpSub : m === 'signup'
      ? (sent ? 'Enter the OTP, your name and a password for your account.' : 'Enter your mobile number. We will send a one-time OTP to verify it.')
      : m === 'reset' ? (sent ? 'Enter the OTP and choose a new password.' : 'Enter your registered mobile number to get an OTP.') : 'Log in with your mobile number and password.';
    const label = s.busy ? 'Please wait...' : m === 'login' ? 'Log In' : !sent ? 'Send OTP' : m === 'otp' ? 'Verify & Log In' : m === 'signup' ? 'Verify & Create Account' : 'Verify & Set Password';
    return { title, subtitle, label };
  };

  const field = (label, icon, attrs, value, extra = '') => `<div class="input-group-minimal"><label class="label-minimal">${label}</label><div class="input-wrapper-minimal">${svg(icon, 16, { cls: 'input-icon-minimal' })}<input ${attrs} value="${esc(value)}" required class="input-field-minimal">${extra}</div></div>`;

  let lastError = '';
  function draw() {
    const m = s.mode, sent = s.otpSent;
    const { title, subtitle, label } = text();
    box.querySelector('[data-login-title]').textContent = title;
    box.querySelector('[data-login-subtitle]').textContent = subtitle;
    box.querySelectorAll('[data-login-tab]').forEach((b) => {
      const on = m === b.dataset.loginTab || (b.dataset.loginTab === 'login' && (m === 'reset' || m === 'otp'));
      b.className = `auth-tab ${on ? 'active' : ''}`;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    const showPass = m === 'login' || (sent && m !== 'otp');
    const showConfirm = m !== 'login' && m !== 'otp' && sent;
    const passType = s.showPassword ? 'text' : 'password';
    let html = field('Mobile Number', 'phone', 'type="text" inputmode="tel" autocomplete="tel" placeholder="10-digit Mobile Number" data-f="phone"', s.phone);
    if (sent) {
      html += field('OTP', 'lock', 'type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="Enter OTP" data-f="otp"', s.otp);
      html += `<div class="form-subtitle" style="display:flex;justify-content:space-between;align-items:center;margin-top:-0.5rem;margin-bottom:1rem"><span>${esc(s.info)}</span><button type="button" data-act="resend"${s.busy ? ' disabled' : ''} class="toggle-link-minimal">Resend OTP</button></div>`;
    }
    if (m === 'signup' && sent) html += field('Full Name', 'user', 'type="text" autocomplete="name" placeholder="Your Full Name" data-f="name"', s.name);
    if (showPass) html += field(m === 'login' ? 'Password' : m === 'reset' ? 'New Password' : 'Set Password', 'lock', `type="${passType}" autocomplete="${m === 'login' ? 'current-password' : 'new-password'}" placeholder="••••••••" data-f="password"`, s.password, `<button type="button" data-act="eye" class="password-toggle-minimal">${svg(s.showPassword ? 'eye-off' : 'eye', 16)}</button>`);
    if (showConfirm) html += field('Confirm Password', 'lock', `type="${passType}" autocomplete="new-password" placeholder="••••••••" data-f="confirm"`, s.confirm);
    if (m === 'login') html += '<div class="form-subtitle" style="display:flex;justify-content:space-between;gap:0.75rem;margin-top:-0.5rem;margin-bottom:1rem"><button type="button" data-act="otp" class="toggle-link-minimal">Log in with OTP</button><button type="button" data-act="reset" class="toggle-link-minimal">Forgot password?</button></div>';
    if (s.error) html += `<div class="error-box-minimal" data-error>${esc(s.error)}</div>`;
    html += `<button type="submit" class="btn-submit-commercial" style="position:relative"${s.busy ? ' disabled' : ''}><span>${esc(label)}</span>${svg('arrow-right', 16, { style: 'position:absolute;right:1.5rem;top:50%;transform:translateY(-50%)' })}</button>`;

    // Keep the caret where the shopper was typing
    const active = document.activeElement && form.contains(document.activeElement) ? document.activeElement.dataset.f : null;
    const caret = active ? document.activeElement.selectionStart : null;
    form.innerHTML = html;
    if (active) { const el = form.querySelector(`[data-f="${active}"]`); if (el) { el.focus(); try { el.setSelectionRange(caret, caret); } catch (e) {} } }
    // The error box pops in when it appears (or changes)
    const err = form.querySelector('[data-error]');
    if (err && !lastError) animate(err, { opacity: [0, 1], scale: [0.95, 1] }, { duration: 0.3 });
    lastError = s.error;

    const toggle = box.querySelector('[data-login-toggle]');
    toggle.innerHTML = `${m === 'signup' ? 'Already have an account? ' : 'New to Daivika? '}<button type="button" class="toggle-link-minimal" data-login-switch>${m === 'signup' ? 'Log In' : 'Create Account'}</button>`;
  }

  // Login / Register tabs fade the form out and back in
  function switchMode(next) {
    if (next === s.mode) return;
    s.transitioning = true;
    box.style.opacity = '0'; box.style.transform = 'translateY(8px)';
    setTimeout(() => {
      setMode(next); draw();
      setTimeout(() => { s.transitioning = false; box.style.opacity = '1'; box.style.transform = 'translateY(0)'; }, 200);
    }, 150);
  }

  form.addEventListener('input', (e) => {
    const f = e.target.dataset.f;
    if (!f) return;
    if (f === 'phone') { s.phone = e.target.value; if (s.otpSent) { clearStep(); draw(); } return; }
    if (f === 'otp') { s.otp = String(e.target.value).replace(/\D/g, '').slice(0, 8); e.target.value = s.otp; return; }
    s[f] = e.target.value;
  });
  form.addEventListener('submit', (e) => { e.preventDefault(); submit(); });
  form.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const a = b.dataset.act;
    if (a === 'eye') { s.showPassword = !s.showPassword; draw(); }
    if (a === 'otp' || a === 'reset') { setMode(a); draw(); }
    if (a === 'resend') { await requestOtp(); draw(); }
  });
  box.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-login-tab]');
    if (tab) return switchMode(tab.dataset.loginTab);
    if (e.target.closest('[data-login-switch]')) switchMode(s.mode === 'signup' ? 'login' : 'signup');
  });

  draw();
})();
