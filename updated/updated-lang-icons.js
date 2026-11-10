/* ============================================================================
   FRAWALA STUDIO — LANGUAGE TOGGLE ICON PRESERVATION
   File    : updated/updated-lang-icons.js
   Problem : script.js > setLanguage() rewrites `textContent` for every element
             that has data-ar / data-en. Elements that also contain icons lose
             those icons on first load and on every language switch:
               - .hero-buttons .btn-primary  → clapperboard icon
               - .hero-buttons .btn-outline  → calendar icon
               - .dropbtn                    → chevron icon
   Solution: re-insert the original icons after each language change. The
             script is idempotent (never duplicates an icon) and does not touch
             any other behaviour.
   Load it AFTER script.js, just before </body>.
   ========================================================================== */

(function () {
    'use strict';

    var TARGETS = [
        {
            selector: '.hero-buttons .btn-primary',
            icon: 'fa-solid fa-clapperboard',
            position: 'prepend'
        },
        {
            selector: '.hero-buttons .btn-outline',
            icon: 'fa-solid fa-calendar-days',
            position: 'prepend'
        },
        {
            selector: '.dropbtn',
            icon: 'fa-solid fa-chevron-down',
            position: 'append',
            style: 'font-size:0.75rem;margin-inline-start:6px;vertical-align:middle;'
        }
    ];

    function hasIcon(host, icon) {
        var wanted = icon.split(' ');
        var icons = host.querySelectorAll('i');

        for (var i = 0; i < icons.length; i++) {
            var matches = true;
            for (var j = 0; j < wanted.length; j++) {
                if (!icons[i].classList.contains(wanted[j])) {
                    matches = false;
                    break;
                }
            }
            if (matches) return true;
        }
        return false;
    }

    function restore() {
        TARGETS.forEach(function (target) {
            var hosts = document.querySelectorAll(target.selector);

            Array.prototype.forEach.call(hosts, function (host) {
                if (hasIcon(host, target.icon)) return;

                var icon = document.createElement('i');
                icon.className = target.icon;
                icon.setAttribute('aria-hidden', 'true');
                if (target.style) icon.setAttribute('style', target.style);

                if (target.position === 'append') {
                    host.appendChild(document.createTextNode(' '));
                    host.appendChild(icon);
                } else {
                    host.insertBefore(icon, host.firstChild);
                }
            });
        });
    }

    function boot() {
        restore();
        window.requestAnimationFrame(restore);
        window.setTimeout(restore, 0);
    }

    function onReady() {
        // script.js registers its own DOMContentLoaded listener first;
        // wait one tick so its setLanguage() call has already run.
        window.setTimeout(boot, 0);
    }

    // The script is loaded with `defer`, so it can run while the document is
    // still "interactive" — before DOMContentLoaded fires. Cover every state.
    document.addEventListener('DOMContentLoaded', onReady);

    if (document.readyState !== 'loading') {
        boot();
    }

    // Re-apply immediately after the header language button is pressed.
    var toggle = document.getElementById('langToggle');
    if (toggle) {
        toggle.addEventListener('click', function () {
            window.setTimeout(restore, 0);
        });
    }

    // Safety net: setLanguage() always updates <html dir> and <html lang>.
    if (window.MutationObserver) {
        new MutationObserver(restore).observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['dir', 'lang']
        });
    }
})();
