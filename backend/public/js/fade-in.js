// Elements with data-fade-in="<delay seconds>" fade in once on load, like framer-motion's
// initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay }}
(function () {
  const { animate } = window.Motion;
  document.querySelectorAll('[data-fade-in]').forEach((el) => {
    animate(el, { opacity: [0, 1] }, { duration: Number(el.dataset.fadeDuration || 1), delay: Number(el.dataset.fadeIn) || 0 });
  });
})();
