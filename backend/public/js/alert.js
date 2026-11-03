// Notice / confirm dialog (context/AlertContext.jsx). Daivika.alert(message, title) and
// Daivika.confirm(message, title) return promises, like showAlert / showConfirm.
(function () {
  const { animate } = window.Motion;
  const root = document.querySelector('[data-alert]');
  const backdrop = root.querySelector('[data-alert-backdrop]');
  const card = root.querySelector('[data-alert-card]');
  const CARD = { duration: 0.2, ease: 'easeOut' };
  let resolver = null;
  let type = 'alert';

  function open(message, title, kind) {
    type = kind;
    root.querySelector('[data-alert-title]').textContent = title;
    root.querySelector('[data-alert-message]').textContent = message;
    root.querySelector('[data-alert-icon="confirm"]').hidden = kind !== 'confirm';
    root.querySelector('[data-alert-icon="alert"]').hidden = kind === 'confirm';
    root.querySelector('[data-alert-cancel]').hidden = kind !== 'confirm';
    root.hidden = false;
    animate(backdrop, { opacity: [0, 1] });
    animate(card, { scale: [0.95, 1], opacity: [0, 1], y: [15, 0] }, CARD);
    return new Promise((resolve) => { resolver = resolve; });
  }

  function close(value) {
    if (resolver) resolver(value);
    resolver = null;
    animate(backdrop, { opacity: 0 });
    animate(card, { scale: 0.95, opacity: 0, y: 15 }, CARD).then(() => { if (!resolver) root.hidden = true; });
  }

  backdrop.addEventListener('click', () => { if (type === 'alert') close(true); });
  root.querySelector('[data-alert-ok]').addEventListener('click', () => close(true));
  root.querySelector('[data-alert-cancel]').addEventListener('click', () => close(false));

  window.Daivika.alert = (message, title = 'Notice') => open(message, title, 'alert');
  window.Daivika.confirm = (message, title = 'Confirm Action') => open(message, title, 'confirm');
})();
