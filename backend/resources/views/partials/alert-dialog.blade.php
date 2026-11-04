{{-- Notice / confirm dialog (context/AlertContext.jsx); opened with Daivika.alert() and Daivika.confirm() --}}
<div data-alert hidden style="position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;padding:1.5rem">
  <div data-alert-backdrop style="position:absolute;inset:0;background-color:rgba(6, 61, 51, 0.4);backdrop-filter:blur(4px)"></div>
  <div data-alert-card style="position:relative;background-color:#ffffff;border:1px solid rgba(6, 61, 51, 0.15);border-radius:16px;width:100%;max-width:420px;padding:1.75rem;box-shadow:0 25px 50px -12px rgba(6, 61, 51, 0.25), 0 10px 15px -3px rgba(0, 0, 0, 0.05);z-index:1;display:flex;flex-direction:column;gap:1.25rem;font-family:&quot;Poppins&quot;, sans-serif">
    <div style="display:flex;gap:0.85rem;align-items:flex-start">
      <div style="background-color:#f4fbf9;border-radius:12px;padding:0.65rem;display:flex;align-items:center;justify-content:center;border:1px solid #d1fae5;flex-shrink:0;color:#0a0a0a">
        <span data-alert-icon="confirm" hidden><x-icon name="alert-triangle" size="22" color="#a67c52" style="display:block" /></span>
        <span data-alert-icon="alert"><x-icon name="check-circle-2" size="22" color="#0a0a0a" style="display:block" /></span>
      </div>
      <div>
        <h3 data-alert-title style="font-size:1.05rem;font-weight:800;color:#0a0a0a;margin:0;line-height:1.3"></h3>
        <p data-alert-message style="font-size:0.85rem;color:#4b5563;margin:0.4rem 0 0 0;line-height:1.5;font-weight:500;text-align:left"></p>
      </div>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:0.75rem;margin-top:0.25rem">
      <button type="button" data-alert-cancel class="dv-alert-cancel" hidden style="padding:0.65rem 1.25rem;border-radius:100px;color:#4b5563;font-size:0.82rem;font-weight:700;cursor:pointer;transition:all 0.15s">Cancel</button>
      <button type="button" data-alert-ok style="padding:0.65rem 1.5rem;border-radius:100px;background-color:#0a0a0a;border:none;color:#ffffff;font-size:0.82rem;font-weight:700;cursor:pointer;box-shadow:0 4px 6px -1px rgba(6, 61, 51, 0.15);transition:all 0.15s">OK</button>
    </div>
  </div>
</div>
