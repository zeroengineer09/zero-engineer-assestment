/* Small accessible UI enhancements for ZERO ENGINEER. */
(() => {
  const eye = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/><path class="eye-slash" d="M4 4 20 20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
  function enhancePasswords() {
    document.querySelectorAll('input[type="password"]').forEach((input) => {
      if (input.dataset.visibilityEnhanced === 'true') return;
      input.dataset.visibilityEnhanced = 'true';
      const wrap = document.createElement('span');
      wrap.className = 'password-field-wrap';
      input.parentNode.insertBefore(wrap, input);
      wrap.appendChild(input);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'password-visibility-toggle';
      button.setAttribute('aria-label', 'Show password');
      button.setAttribute('aria-pressed', 'false');
      button.innerHTML = eye;
      button.addEventListener('click', () => {
        const reveal = input.type === 'password';
        input.type = reveal ? 'text' : 'password';
        button.setAttribute('aria-label', reveal ? 'Hide password' : 'Show password');
        button.setAttribute('aria-pressed', String(reveal));
        button.querySelector('.eye-slash')?.setAttribute('opacity', reveal ? '0' : '1');
        input.focus({ preventScroll: true });
      });
      wrap.appendChild(button);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhancePasswords);
  else enhancePasswords();
  // Re-apply to dynamically revealed login/reset forms and password inputs.
  const observer = new MutationObserver(enhancePasswords);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
