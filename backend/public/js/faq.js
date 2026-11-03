// FAQ page: same motion values as the React page it replaced
(function () {
  const { animate } = window.Motion;
  const EASE_OUT = [0.23, 1, 0.32, 1];
  const ICON_SPRING = { type: 'spring', stiffness: 500, damping: 25, restSpeed: 10 };
  const PLUS = document.getElementById('faq-icon-plus').innerHTML;
  const MINUS = document.getElementById('faq-icon-minus').innerHTML;

  const list = document.getElementById('faq-list');
  const items = [...list.querySelectorAll('[data-faq]')];
  const tabs = [...document.querySelectorAll('[data-faq-tab]')];
  let visible = items;

  function paint(item, open) {
    const q = item.querySelector('h3');
    const icon = item.querySelector('[data-faq-icon]');
    item.style.backgroundColor = open ? '#fafafa' : '#fff';
    q.style.color = open ? 'var(--color-primary)' : '#111';
    icon.style.color = open ? 'var(--color-primary)' : '#999';
    icon.style.backgroundColor = open ? '#fff' : 'transparent';
    icon.innerHTML = open ? MINUS : PLUS;
    item.querySelector('button').setAttribute('aria-expanded', open ? 'true' : 'false');
    animate(icon, { rotate: open ? 180 : 0 }, ICON_SPRING);
  }

  function setOpen(item, open, instant) {
    const panel = item.querySelector('[data-faq-panel]');
    if (item.dataset.open === String(open)) return;
    item.dataset.open = String(open);
    paint(item, open);
    if (open) panel.hidden = false;
    panel.style.overflow = 'hidden';
    const options = { duration: instant ? 0 : 0.5, ease: EASE_OUT };
    const height = open ? [0, panel.scrollHeight] : [panel.offsetHeight, 0];
    const run = animate(panel, { height, opacity: open ? [0, 1] : [1, 0] }, options);
    run.then(() => {
      if (item.dataset.open !== String(open)) return;
      panel.style.height = open ? 'auto' : '';
      panel.style.overflow = '';
      if (!open) panel.hidden = true;
    });
  }

  items.forEach((item) => {
    item.querySelector('button').addEventListener('click', () => {
      const open = item.dataset.open === 'true';
      if (!open) visible.forEach((other) => setOpen(other, false));
      setOpen(item, !open);
    });
  });

  let switching = 0;
  tabs.forEach((tab) => {
    tab.addEventListener('click', async () => {
      const token = ++switching;
      const category = tab.dataset.faqTab;
      tabs.forEach((t) => {
        const on = t === tab;
        t.style.backgroundColor = on ? 'var(--color-primary)' : 'transparent';
        t.style.color = on ? '#fff' : '#666';
        t.style.border = on ? 'none' : '1px solid #eee';
      });
      await animate(list, { opacity: 0, y: -20 }, { duration: 0.5 });
      if (token !== switching) return;
      items.forEach((item) => {
        item.hidden = category !== 'All' && item.dataset.faq !== category;
        item.dataset.open = 'false';
        item.querySelector('[data-faq-panel]').hidden = true;
        paint(item, false);
      });
      visible = items.filter((item) => !item.hidden);
      if (visible[0]) setOpen(visible[0], true);
      animate(list, { opacity: [0, 1], y: [20, 0] }, { duration: 0.5 });
    });
  });

  // Entrance animations
  animate('#faq-tabs', { opacity: [0, 1], y: [20, 0] }, { duration: 0.8, delay: 0.3 });
  animate(list, { opacity: [0, 1], y: [20, 0] }, { duration: 0.5 });
  setOpen(items[0], true);

  // The React page renders its questions after mounting, so this card starts on screen and its
  // whileInView entrance plays straight away on load; do the same here
  const card = document.getElementById('faq-help');
  animate(card, { opacity: 1 }, { duration: 0.3, ease: [0.25, 0.1, 0.35, 1] });
  animate(card, { y: 0 }, ICON_SPRING);
})();
