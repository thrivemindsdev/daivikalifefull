// Load-time entrance animations, like framer-motion's initial/animate pairs. An element declares where it
// starts: data-enter='{"opacity":0,"y":20}' (its inline style already shows that state, as React's server
// render did) plus data-enter-duration / data-enter-delay in seconds and an optional data-enter-ease
// (cubic-bezier array as JSON). It animates to opacity 1, x/y 0, scale 1.
(function () {
  const { animate } = window.Motion;
  const END = { opacity: 1, x: 0, y: 0, scale: 1 };
  // framer-motion's defaults when a component gives no transition: opacity tweens, x/y use a bouncy
  // spring, scale a stiff one
  const DEFAULTS = {
    opacity: { duration: 0.3, ease: [0.25, 0.1, 0.35, 1] },
    x: { type: 'spring', stiffness: 500, damping: 25, restSpeed: 10 },
    y: { type: 'spring', stiffness: 500, damping: 25, restSpeed: 10 },
    scale: { type: 'spring', stiffness: 550, damping: 30, restSpeed: 10 },
  };
  document.querySelectorAll('[data-enter]').forEach((el) => {
    const from = JSON.parse(el.dataset.enter);
    const delay = Number(el.dataset.enterDelay || 0);
    const moves = 'x' in from || 'y' in from || 'scale' in from;
    // Afterwards the element has no transform of its own, so CSS :hover transforms work
    const done = () => { if (moves) el.style.transform = ''; };
    if (el.dataset.enterTransition === 'default') {
      Promise.all(Object.entries(from).map(([k, v]) => animate(el, { [k]: [v, END[k]] }, { ...DEFAULTS[k], delay }))).then(done);
      return;
    }
    const keyframes = Object.fromEntries(Object.entries(from).map(([k, v]) => [k, [v, END[k]]]));
    const options = { duration: Number(el.dataset.enterDuration || 0.5), delay };
    if (el.dataset.enterEase) options.ease = JSON.parse(el.dataset.enterEase);
    animate(el, keyframes, options).then(done);
  });
})();

// whileInView entrances (viewport once): data-inview='{"y":"100%"}' plus the same duration / delay / ease
// attributes. Used by <x-animated-title>.
(function () {
  const { animate, inView } = window.Motion;
  document.querySelectorAll('[data-inview]').forEach((el) => {
    const from = JSON.parse(el.dataset.inview);
    const to = { opacity: 1, x: 0, y: 0, scale: 1 };
    const keyframes = Object.fromEntries(Object.entries(from).map(([k, v]) => [k, [v, to[k]]]));
    const options = { duration: Number(el.dataset.enterDuration || 0.5), delay: Number(el.dataset.enterDelay || 0) };
    if (el.dataset.enterEase) options.ease = JSON.parse(el.dataset.enterEase);
    inView(el, () => { animate(el, keyframes, options).then(() => { el.style.transform = ''; }); });
  });
})();
