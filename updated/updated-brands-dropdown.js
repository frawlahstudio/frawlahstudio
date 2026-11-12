/* ============================================================================
   FRAWALA STUDIO — MOBILE BRANDS DROPDOWN FIX
   File : updated/updated-brands-dropdown.js

   PROBLEM
   -------
   script.js binds a "close the mobile menu" handler to every `.nav-list a`,
   including the Brands button (`.dropbtn`). On a phone, tapping "Brands":
     1. closes `.nav-menu` (it slides off-screen), then
     2. toggles `.dropdown.open`.
   The dropdown does open, but inside a menu that has already disappeared —
   so the user sees nothing happen.

   In addition, the old handler only listened for `click`. On touch devices
   that is fragile (300ms delay, synthetic mouse events, sticky hover).

   SOLUTION
   --------
   - A capture-phase `touchstart/touchmove/touchend` handler turns a real tap
     into the toggle, calls preventDefault() to suppress the synthetic click,
     and calls stopPropagation() so script.js never closes the mobile menu.
   - A capture-phase `click` handler covers mouse clicks, keyboards and
     browsers that do not deliver touch events (with de-duplication so a tap
     never toggles twice).
   - Outside click, Escape, menu close, brand selection and desktop resize all
     reset the `.open` class and `aria-expanded` correctly.

   Load AFTER script.js, just before </body>:
       <script src="updated/updated-brands-dropdown.js" defer></script>
   ========================================================================== */

(function () {
    'use strict';

    var MOBILE_QUERY = '(max-width: 1024px)';
    var TAP_SLOP = 12;          // px of finger movement still counted as a tap
    var TAP_MAX_MS = 900;       // longer press is treated as a long-press, not a tap
    var CLICK_SUPPRESS_MS = 700; // ignore the synthetic click after a handled tap

    var touchStart = null;
    var lastTouchHandled = 0;

    function isMobile() {
        return window.matchMedia(MOBILE_QUERY).matches;
    }

    function getNavMenu() {
        return document.querySelector('.nav-menu');
    }

    function getDropdowns() {
        return Array.prototype.slice.call(document.querySelectorAll('.dropdown'));
    }

    function setOpen(dropdown, open) {
        if (!dropdown) return;

        dropdown.classList.toggle('open', open);

        var btn = dropdown.querySelector('.dropbtn');
        if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');

        if (open) revealInNav(dropdown);
    }

    function closeAll(except) {
        getDropdowns().forEach(function (dropdown) {
            if (dropdown !== except) setOpen(dropdown, false);
        });
    }

    function toggle(btn) {
        if (!btn || !btn.closest) return;

        var dropdown = btn.closest('.dropdown');
        if (!dropdown) return;

        var willOpen = !dropdown.classList.contains('open');
        closeAll(dropdown);
        setOpen(dropdown, willOpen);
    }

    /**
     * On phones the mobile panel is scrollable. After the expansion animation,
     * make sure the brand links are not below the visible area.
     */
    function revealInNav(dropdown) {
        var nav = getNavMenu();
        var panel = dropdown.querySelector('.dropdown-content');
        if (!nav || !panel || !nav.classList.contains('active')) return;

        window.setTimeout(function () {
            if (!dropdown.classList.contains('open')) return;
            if (nav.scrollHeight <= nav.clientHeight + 1) return;

            var navRect = nav.getBoundingClientRect();
            var panelRect = panel.getBoundingClientRect();
            var overflow = panelRect.bottom - (navRect.bottom - 16);

            if (overflow > 0) nav.scrollTop += overflow;
        }, 340);
    }

    /* ----------------------------------------------------------------------
       1. TOUCH — real tap detection
       ---------------------------------------------------------------------- */
    document.addEventListener('touchstart', function (event) {
        touchStart = null;

        var target = event.target;
        var btn = target && target.closest ? target.closest('.dropbtn') : null;

        if (!btn || !isMobile() || event.touches.length !== 1) return;

        var touch = event.changedTouches[0];
        touchStart = {
            btn: btn,
            x: touch.clientX,
            y: touch.clientY,
            time: Date.now(),
            moved: false
        };
    }, { capture: true, passive: true });

    document.addEventListener('touchmove', function (event) {
        if (!touchStart) return;

        var touch = event.changedTouches[0];
        if (!touch) return;

        if (
            Math.abs(touch.clientX - touchStart.x) > TAP_SLOP ||
            Math.abs(touch.clientY - touchStart.y) > TAP_SLOP
        ) {
            touchStart.moved = true;
        }
    }, { capture: true, passive: true });

    document.addEventListener('touchend', function (event) {
        if (!touchStart) return;

        var start = touchStart;
        touchStart = null;

        // A scroll gesture or a long press is not a tap.
        if (start.moved || !isMobile()) return;
        if (Date.now() - start.time > TAP_MAX_MS) return;

        // Stop the browser's synthetic click and, more importantly, stop
        // script.js from closing the whole mobile menu on this same tap.
        event.preventDefault();
        event.stopPropagation();

        lastTouchHandled = Date.now();
        toggle(start.btn);
    }, { capture: true, passive: false });

    document.addEventListener('touchcancel', function () {
        touchStart = null;
    }, { capture: true, passive: true });

    /* ----------------------------------------------------------------------
       2. CLICK — mouse, keyboard, and browsers without touch events
       ---------------------------------------------------------------------- */
    document.addEventListener('click', function (event) {
        var target = event.target;
        var btn = target && target.closest ? target.closest('.dropbtn') : null;

        if (!btn) return;

        // Desktop keeps the original hover behaviour untouched.
        if (!isMobile()) return;

        event.preventDefault();
        event.stopPropagation();

        // The tap was already handled in `touchend`.
        if (Date.now() - lastTouchHandled < CLICK_SUPPRESS_MS) return;

        toggle(btn);
    }, { capture: true });

    /* ----------------------------------------------------------------------
       3. RESET — brand chosen, menu closed, Escape, resize
       ---------------------------------------------------------------------- */
    // Choosing a brand link closes the dropdown immediately. script.js also
    // closes the mobile menu and opens the category view.
    document.addEventListener('click', function (event) {
        var item = event.target && event.target.closest
            ? event.target.closest('.dropdown-content a')
            : null;

        if (item) closeAll();
    });

    // Whenever the mobile panel closes by any path (menu button, nav link,
    // category link, script.js), collapse the dropdown too.
    var nav = getNavMenu();
    if (nav && window.MutationObserver) {
        new MutationObserver(function () {
            if (!nav.classList.contains('active')) closeAll();
        }).observe(nav, { attributes: true, attributeFilter: ['class'] });
    }

    // Escape closes the dropdown and returns focus to its button.
    document.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape' && event.key !== 'Esc') return;

        var open = document.querySelector('.dropdown.open');
        if (!open) return;

        closeAll();

        var btn = open.querySelector('.dropbtn');
        if (btn && typeof btn.focus === 'function') {
            btn.focus({ preventScroll: true });
        }
    });

    // Leaving the small-screen layout: drop the touch state and close panels.
    var resizeTimer = null;
    window.addEventListener('resize', function () {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(function () {
            if (!isMobile()) closeAll();
        }, 150);
    });

    var mql = window.matchMedia(MOBILE_QUERY);
    var onBreakpointChange = function (event) {
        if (!event.matches) closeAll();
    };

    if (typeof mql.addEventListener === 'function') {
        mql.addEventListener('change', onBreakpointChange);
    } else if (typeof mql.addListener === 'function') {
        mql.addListener(onBreakpointChange);
    }
})();
