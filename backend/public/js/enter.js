// Load-time entrance animations, like framer-motion's initial/animate pairs. An element declares where it
// starts: data-enter='{"opacity":0,"y":20}' (its inline style already shows that state, as React's server
// render did) plus data-enter-duration / data-enter-delay in seconds and an optional data-enter-ease
// (cubic-bezier array as JSON). It animates to opacity 1, x/y 0, scale 1.
(function () {
  const { animate } = window.Motion;
  const END = { opacity: 1, x: 0, y: 0, scale: 1 };
  document.querySelectorAll('[data-enter]').forEach((el) => {
    const from = JSON.parse(el.dataset.enter);
    const keyframes = Object.fromEntries(Object.entries(from).map(([k, v]) => [k, [v, END[k]]]));
    const options = { duration: Number(el.dataset.enterDuration || 0.5), delay: Number(el.dataset.enterDelay || 0) };
    if (el.dataset.enterEase) options.ease = JSON.parse(el.dataset.enterEase);
    // Afterwards the element has no transform of its own, so CSS :hover transforms work
    animate(el, keyframes, options).then(() => { if ('x' in from || 'y' in from || 'scale' in from) el.style.transform = ''; });
  });
})();
