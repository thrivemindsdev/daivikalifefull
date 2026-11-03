// Contact form (app/(store)/contact/page.jsx): sends to /api/public/contact and shows the success modal
(function () {
  const { animate } = window.Motion;
  const D = window.Daivika;
  const form = document.querySelector('[data-contact-form]');
  const send = form.querySelector('[data-contact-send]');
  const modal = document.querySelector('[data-contact-success]');
  const backdrop = modal.querySelector('[data-contact-success-backdrop]');
  const card = modal.querySelector('[data-contact-success-card]');

  function setBusy(busy) {
    send.disabled = busy;
    send.style.opacity = busy ? 0.7 : 1;
    send.querySelector('[data-contact-idle]').hidden = busy;
    send.querySelector('[data-contact-busy]').hidden = !busy;
  }

  function showSuccess() {
    modal.hidden = false;
    animate(backdrop, { opacity: [0, 1] });
    animate(card, { scale: [0.95, 1], opacity: [0, 1], y: [15, 0] });
  }
  function hideSuccess() {
    animate(backdrop, { opacity: 0 });
    animate(card, { scale: 0.95, opacity: 0, y: 15 }).then(() => { modal.hidden = true; });
  }
  backdrop.addEventListener('click', hideSuccess);
  modal.querySelector('[data-contact-done]').addEventListener('click', hideSuccess);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (!data.name || !data.email || !data.message) return;
    setBusy(true);
    try {
      const res = await fetch(`${D.API}/public/contact`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const json = await res.json();
      if (json.success) { showSuccess(); form.reset(); }
      else D.alert(json.message || 'Failed to send message. Please try again.', 'Contact Support');
    } catch (err) {
      console.error(err);
      D.alert('Network error. Failed to reach the server.', 'Connection Error');
    } finally {
      setBusy(false);
    }
  });
})();
