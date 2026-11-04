// Wishlist page (app/(store)/wishlist/page.jsx): guest card until the login check finds a shopper, then
// their saved products. Removed cards fade out and the rest slide into place (framer `layout`).
(function () {
  const { animate } = window.Motion;
  const D = window.Daivika;
  const guest = document.querySelector('[data-wishlist-guest]');
  const view = document.querySelector('[data-wishlist-user]');
  const grid = view.querySelector('[data-wishlist-grid]');
  const empty = view.querySelector('[data-wishlist-empty]');
  const nodes = new Map();
  let shown = false;

  function render() {
    const items = D.wishlist.items;
    const keep = new Set(items.map((p) => p.id || p._id));
    const before = new Map([...nodes].map(([id, n]) => [id, n.getBoundingClientRect()]));

    nodes.forEach((node, id) => {
      if (keep.has(id)) return;
      nodes.delete(id);
      node.style.pointerEvents = 'none';
      animate(node, { opacity: 0, scale: 0.9 }, { duration: 0.3 }).then(() => { node.remove(); slide(); });
    });

    items.forEach((product) => {
      const id = product.id || product._id;
      if (nodes.has(id)) return;
      const wrap = document.createElement('div');
      const card = D.productCards.create(product);
      if (!card) return;
      wrap.appendChild(card);
      grid.appendChild(wrap);
      nodes.set(id, wrap);
      animate(wrap, { opacity: [0, 1], scale: [0.9, 1] }, { duration: 0.3 });
    });

    // Remaining cards glide from where they were to where they are now
    function slide() {
      nodes.forEach((node, id) => {
        const was = before.get(id);
        if (!was) return;
        const now = node.getBoundingClientRect();
        const dx = was.left - now.left, dy = was.top - now.top;
        if (dx || dy) animate(node, { x: [dx, 0], y: [dy, 0] }, { duration: 0.3 });
      });
    }

    const isEmpty = items.length === 0;
    if (isEmpty && empty.hidden) {
      empty.hidden = false;
      animate(empty, { opacity: [0, 1] }, { duration: 0.3, ease: [0.25, 0.1, 0.35, 1] });
      animate(empty, { y: [20, 0] }, { type: 'spring', stiffness: 500, damping: 25, restSpeed: 10 });
    }
    if (!isEmpty) empty.hidden = true;
    grid.hidden = isEmpty && nodes.size === 0;
  }

  D.on('auth', (auth) => {
    if (auth.loading) return;
    const user = !!auth.user;
    guest.hidden = user;
    view.hidden = !user;
    if (user && !shown) { shown = true; render(); }
  });
  D.on('wishlist', () => { if (shown) render(); });
})();
