// Load-time entrance animations, like framer-motion's initial/animate pairs. An element declares where it
// starts: data-enter='{"opacity":0,"y":20}' (its inline style already shows that state, as React's server
// render did) plus data-enter-duration / data-enter-delay in seconds. It animates to opacity 1, x/y 0, scale 1.
(function () {
  const { animate } = window.Motion;
  const END = { opacity: 1, x: 0, y: 0, scale: 1 };
  document.querySelectorAll('[data-enter]').forEach((el) => {
    const from = JSON.parse(el.dataset.enter);
    const keyframes = Object.fromEntries(Object.entries(from).map(([k, v]) => [k, [v, END[k]]]));
    animate(el, keyframes, {
      duration: Number(el.dataset.enterDuration || 0.5),
      delay: Number(el.dataset.enterDelay || 0),
    }).then(() => { if (!('x' in from || 'y' in from || 'scale' in from)) return; el.style.transform = 'none'; });
  });
})();
