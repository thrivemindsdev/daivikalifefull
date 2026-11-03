// First-visit coupon popup (components/WelcomeCouponPopup.jsx): opens once per browser, `delaySeconds`
// after the login check finishes, unless the admin switched it off.
(function () {
  const { animate } = window.Motion;
  const D = window.Daivika;
  const root = document.querySelector('[data-popup]');
  if (!root) return;
  const SEEN = 'daivika_coupon_popup_seen';
  const fit = root.querySelector('[data-popup-fit]');
  const seen = () => { try { return localStorage.getItem(SEEN) === '1'; } catch (e) { return false; } };
  let timer = null;
  let shimmer = null;
  let observer = null;

  function scaleToFit() {
    fit.style.transform = 'scale(1)';
    const available = window.innerHeight - 32;
    const h = fit.offsetHeight;
    fit.style.transform = `scale(${h > available ? available / h : 1})`;
  }

  function open() {
    try { localStorage.setItem(SEEN, '1'); } catch (e) { /* ignore */ }
    root.hidden = false;
    scaleToFit();
    observer = new ResizeObserver(scaleToFit);
    observer.observe(fit);
    window.addEventListener('resize', scaleToFit);
    animate(root.querySelector('[data-popup-backdrop]'), { opacity: [0, 1] }, { duration: 0.25 });
    animate(root.querySelector('[data-popup-card]'), { opacity: [0, 1], scale: [0.9, 1], y: [20, 0] }, { type: 'spring', damping: 26, stiffness: 320 });
    const s = root.querySelector('[data-popup-shimmer]');
    if (s) shimmer = animate(s, { x: ['-100%', '200%'] }, { duration: 2.2, repeat: Infinity, ease: 'linear', repeatDelay: 1.2 });
  }

  function close() {
    root.hidden = true;
    if (observer) observer.disconnect();
    window.removeEventListener('resize', scaleToFit);
    if (shimmer) shimmer.stop();
  }

  root.querySelector('[data-popup-backdrop]').addEventListener('click', close);
  root.querySelector('[data-popup-close]').addEventListener('click', close);
  const shop = root.querySelector('[data-popup-shop]');
  if (shop) shop.addEventListener('click', close);
  const redirect = root.querySelector('[data-popup-redirect]');
  if (redirect) redirect.addEventListener('click', () => { window.location.href = redirect.dataset.popupRedirect; });

  const copy = root.querySelector('[data-popup-copy]');
  let copiedTimer = null;
  function setCopied(on) {
    copy.style.background = on ? 'linear-gradient(135deg, #16a34a, #15803d)' : 'linear-gradient(135deg, #3d0b10, #5c1520)';
    copy.style.color = on ? '#ffffff' : '#fde68a';
    copy.style.boxShadow = on ? '0 2px 8px rgba(22,163,74,0.3)' : '0 3px 10px rgba(54,9,16,0.3)';
    copy.querySelector('[data-popup-copy-icon]').hidden = on;
    copy.querySelector('[data-popup-copied-icon]').hidden = !on;
    copy.querySelector('[data-popup-copy-label]').textContent = on ? 'COPIED!' : 'COPY';
  }
  copy.addEventListener('click', () => {
    const code = root.dataset.code;
    if (navigator.clipboard) navigator.clipboard.writeText(code).catch(() => {});
    localStorage.setItem('daivika_pending_coupon', code);
    setCopied(true);
    clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => setCopied(false), 2500);
  });

  D.on('auth', (auth) => {
    root.querySelector('[data-popup-hint]').innerHTML = auth.user ? 'Copy this sacred code &amp; apply it at checkout' : 'Copy this sacred code &amp; login to apply at checkout';
    if (auth.loading || timer || root.dataset.enabled === 'false' || seen()) return;
    timer = setTimeout(open, Number(root.dataset.delay) * 1000);
  });
})();
