/* Shared behaviour for every page of the LANET 2027 site. */

// Mobile navigation toggle.
(function () {
  const toggle = document.querySelector('.nav-toggle');
  const menu   = document.querySelector('.nav-menu');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    toggle.classList.toggle('open');
    menu.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!toggle.contains(e.target) && !menu.contains(e.target)) {
      toggle.classList.remove('open');
      menu.classList.remove('open');
    }
  });
})();

// Assemble obfuscated email addresses. The "@" never appears in the served
// HTML, so the address is not harvestable from the page source.
(function () {
  document.querySelectorAll('.obf-email').forEach((el) => {
    el.textContent = el.dataset.u + '@' + el.dataset.d;
  });
})();
