// Global toasts from the store layout: `show_toast` events (any page) and the logout confirmation
(function () {
  const { animate } = window.Motion;
  const toast = document.querySelector('[data-toast]');
  const logout = document.querySelector('[data-logout-toast]');
  const SPRING = { type: 'spring', stiffness: 350, damping: 26 };
  let hideTimer = null;
  let visible = false;

  function hide() {
    if (!visible) return;
    visible = false;
    animate(toast, { opacity: 0, y: 40, scale: 0.9, x: 0 }, SPRING).then(() => { if (!visible) toast.hidden = true; });
  }

  window.addEventListener('show_toast', (e) => {
    const { message, type = 'success' } = e.detail || {};
    const colour = type === 'error' ? '#ef4444' : '#360910';
    const dot = toast.querySelector('[data-toast-dot]');
    dot.style.backgroundColor = colour;
    dot.style.boxShadow = `0 0 10px ${colour}`;
    toast.querySelector('[data-toast-icon="error"]').hidden = type !== 'error';
    toast.querySelector('[data-toast-icon="success"]').hidden = type === 'error';
    toast.querySelector('[data-toast-text]').textContent = message;
    if (!visible) {
      visible = true;
      toast.hidden = false;
      animate(toast, { opacity: [0, 1], y: [40, 0], scale: [0.9, 1], x: 0 }, SPRING);
    }
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, 4000);
  });

  // Swipe sideways more than 80px to dismiss (framer drag="x")
  let startX = null;
  toast.addEventListener('pointerdown', (e) => { startX = e.clientX; toast.setPointerCapture(e.pointerId); animate(toast, { scale: 0.95 }); });
  toast.addEventListener('pointermove', (e) => { if (startX !== null) toast.style.transform = `translateX(${(e.clientX - startX) * 0.6}px) scale(0.95)`; });
  toast.addEventListener('pointerup', (e) => {
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 80) { clearTimeout(hideTimer); hide(); } else animate(toast, { x: 0, scale: 1 }, SPRING);
  });

  // Logging out usually opens the home page next, so the confirmation is carried over to that page
  const FLAG = 'dv_logout_toast';
  function showLogout() {
    logout.hidden = false;
    animate(logout, { opacity: [0, 1], y: [50, 0], x: ['-50%', '-50%'], scale: [0.9, 1] });
    setTimeout(() => {
      sessionStorage.removeItem(FLAG);
      animate(logout, { opacity: 0, y: 20, x: '-50%', scale: 0.9 }).then(() => { logout.hidden = true; });
    }, 4000);
  }
  window.addEventListener('vaugun_logout_success', () => { sessionStorage.setItem(FLAG, '1'); showLogout(); });
  if (sessionStorage.getItem(FLAG)) showLogout();
})();
