// Floating "Sacred Order" bar (components/FloatingCart.jsx): visible while the cart has items, the drawer
// is closed and the page is not near the footer. Each time it appears it plays its entrance again.
(function () {
  const { animate } = window.Motion;
  const D = window.Daivika;
  const wrap = document.querySelector('[data-fc-wrap]');
  if (!wrap) return;
  const bar = wrap.querySelector('[data-fc]');
  const badge = wrap.querySelector('[data-fc-count]');
  const arrow = wrap.querySelector('[data-fc-arrow]');
  let nearFooter = false;
  let lastCount = null;
  let shimmer = null;

  function update() {
    const count = D.cart.count();
    const visible = count > 0 && !D.cart.isOpen && !nearFooter;
    if (visible && wrap.hidden) {
      wrap.hidden = false;
      animate(bar, { y: [60, 0], opacity: [0, 1], scale: [0.9, 1] });
      shimmer = animate(wrap.querySelector('[data-fc-shimmer]'), { left: ['-100%', '200%'] }, { repeat: Infinity, duration: 2.5, ease: 'easeInOut', repeatDelay: 1.5 });
    } else if (!visible && !wrap.hidden) {
      wrap.hidden = true;
      if (shimmer) shimmer.stop();
    }
    if (count !== lastCount) {
      badge.textContent = count;
      if (lastCount !== null && count > 0 && !wrap.hidden) {
        animate(badge, { scale: [0, 1] });
        animate(wrap.querySelector('[data-fc-icon]'), { y: [-5, 2, -2, 0] }, { duration: 0.35 });
      }
      lastCount = count;
    }
    wrap.querySelector('[data-fc-total]').textContent = `₹${D.inr(D.cart.total())}`;
  }

  // Hide near the footer
  const onScroll = () => {
    const el = document.documentElement;
    nearFooter = el.scrollHeight - el.clientHeight - (window.scrollY || el.scrollTop) < 360;
    update();
  };
  window.addEventListener('scroll', onScroll);

  bar.addEventListener('mouseenter', () => { animate(bar, { y: -3, scale: 1.02 }); animate(arrow, { x: 3 }, { type: 'spring', stiffness: 300, damping: 15 }); });
  bar.addEventListener('mouseleave', () => { animate(bar, { y: 0, scale: 1 }); animate(arrow, { x: 0 }, { type: 'spring', stiffness: 300, damping: 15 }); });
  bar.addEventListener('pointerdown', () => animate(bar, { scale: 0.98 }));
  bar.addEventListener('pointerup', () => animate(bar, { scale: bar.matches(':hover') ? 1.02 : 1 }));
  wrap.querySelector('[data-fc-open]').addEventListener('click', (e) => { e.stopPropagation(); D.cart.open(); });
  wrap.querySelector('[data-fc-checkout]').addEventListener('click', (e) => { e.stopPropagation(); window.location.href = '/checkout'; });

  D.on('cart', update);
  onScroll();
})();
