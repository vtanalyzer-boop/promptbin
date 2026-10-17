// Runs before first paint: apply the saved (or system) colour theme to avoid a flash.
(function () {
  try {
    var t = localStorage.getItem('pb_theme');
    if (t !== 'dark' && t !== 'light') t = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) { document.documentElement.setAttribute('data-theme', 'light'); }
})();
