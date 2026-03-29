export function generateNavigationToggleScript(): string {
  return `
  <script>
    (function() {
      function closeNav(nav) {
        if (!nav) {
          return;
        }
        var menu = nav.querySelector('.nav-menu');
        var toggle = nav.querySelector('.nav-toggle');
        if (menu) {
          menu.classList.remove('open');
        }
        if (toggle) {
          toggle.setAttribute('aria-expanded', 'false');
        }
      }

      function closeAllNavs() {
        document.querySelectorAll('.site-nav').forEach(closeNav);
      }

      function handleToggleClick(toggle) {
        var nav = toggle.closest('.site-nav');
        var menu = nav ? nav.querySelector('.nav-menu') : null;
        if (!nav || !menu) {
          return;
        }

        var isOpen = menu.classList.contains('open');
        closeAllNavs();
        if (!isOpen) {
          menu.classList.add('open');
          toggle.setAttribute('aria-expanded', 'true');
        }
      }

      document.addEventListener('click', function(event) {
        var target = event.target;
        if (!target || !target.closest) {
          return;
        }

        var toggle = target.closest('.site-nav .nav-toggle');
        if (toggle) {
          event.preventDefault();
          handleToggleClick(toggle);
          return;
        }

        var navLink = target.closest('.site-nav a');
        if (navLink) {
          closeAllNavs();
          return;
        }

        if (!target.closest('.site-nav')) {
          closeAllNavs();
        }
      }, true);

      document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
          closeAllNavs();
        }
      });
    })();
  </script>
`;
}
