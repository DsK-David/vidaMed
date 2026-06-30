// ===== APP.JS =====
// Inicialização global

document.addEventListener('DOMContentLoaded', () => {
  // Mobile sidebar drawer
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const hamburger = document.getElementById('btn-hamburger');
  const closeBtn = document.getElementById('btn-sidebar-close');
  const sidebarLinks = sidebar?.querySelectorAll('.sidebar__link');

  function openSidebar() {
    if (!sidebar || !overlay) return;
    sidebar.classList.add('sidebar--open');
    overlay.classList.add('sidebar-overlay--visible');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    if (!sidebar || !overlay) return;
    sidebar.classList.remove('sidebar--open');
    overlay.classList.remove('sidebar-overlay--visible');
    document.body.style.overflow = '';
  }

  if (hamburger) hamburger.addEventListener('click', openSidebar);
  if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
  if (overlay) overlay.addEventListener('click', closeSidebar);
  if (sidebarLinks) {
    sidebarLinks.forEach(link => link.addEventListener('click', closeSidebar));
  }
});
