// Checkmarks stay in this browser; they are never sent to a server.
for (const checkbox of document.querySelectorAll('[data-check]')) {
  const key = 'textphone:' + location.pathname + ':' + checkbox.dataset.check;
  try { checkbox.checked = localStorage.getItem(key) === 'true'; } catch {}
  checkbox.addEventListener('change', () => {
    try { localStorage.setItem(key, String(checkbox.checked)); } catch {}
  });
}
