{{-- Logout confirmation and the global toast (app/(store)/layout.jsx); shown by public/js/toasts.js --}}
<div data-logout-toast hidden style="position:fixed;bottom:40px;left:50%;width:max-content;z-index:9999999;background-color:#111827;color:#fff;padding:1rem 2rem;border-radius:100px;display:flex;align-items:center;text-align:center;gap:1rem;box-shadow:0 25px 50px -12px rgba(0, 0, 0, 0.5);border:1px solid rgba(255,255,255,0.1);backdrop-filter:blur(10px)">
  <div style="width:32px;height:32px;border-radius: 50%;background-color:rgba(54, 9, 16, 0.15);color:#360910;display:flex;align-items:center;justify-content:center"><x-icon name="check-circle-2" size="18" /></div>
  <div style="display:flex;flex-direction:column">
    <span style="font-size:0.9rem;font-weight:800;letter-spacing:0.5px">Successfully logged out</span>
    <span style="font-size:0.7rem;color:rgba(255,255,255,0.5);font-weight:500">Securely disconnected from this device</span>
  </div>
</div>

<div data-toast hidden style="position:fixed;bottom:2rem;left:0;right:0;margin:0 auto;width:max-content;max-width:calc(100vw - 2rem);background-color:rgba(15, 23, 42, 0.75);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255, 255, 255, 0.1);color:#ffffff;padding:0.6rem 1.4rem;border-radius:9999px;z-index:99999999;font-weight:600;font-size:0.825rem;box-shadow:0 8px 32px 0 rgba(0, 0, 0, 0.2), 0 4px 6px rgba(0, 0, 0, 0.05);display:flex;align-items:center;gap:0.65rem;cursor:grab;touch-action:none;user-select:none;font-family:'Poppins', sans-serif">
  <span data-toast-dot style="display:inline-block;width:8px;height:8px;border-radius: 50%;flex-shrink:0"></span>
  <span data-toast-icon="error" hidden><x-icon name="alert-triangle" size="14" color="#ef4444" style="flex-shrink:0;display:block" /></span>
  <span data-toast-icon="success"><x-icon name="check-circle-2" size="14" color="#360910" style="flex-shrink:0;display:block" /></span>
  <span data-toast-text style="letter-spacing:-0.1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></span>
</div>
