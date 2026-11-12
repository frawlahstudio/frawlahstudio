/* ============================================================================
   FRAWALA STUDIO — WHATSAPP LINK REPLACEMENT
   File : updated/updated-whatsapp-link.js

   Searches the whole document for any old WhatsApp link and replaces it with
   the official link from updated/updated-whatsapp-config.js:
       https://wa.me/qr/7OPJFROHEVRGM1

   Covered locations
   -----------------
   - Floating WhatsApp contact button
   - Footer social icons (a WhatsApp icon is added when missing)
   - Any other anchor using wa.me, api.whatsapp.com, web.whatsapp.com,
     chat.whatsapp.com or the whatsapp: scheme
   - Links added later by JavaScript (via MutationObserver)

   Load AFTER updated/updated-whatsapp-config.js:
       <script src="updated/updated-whatsapp-link.js" defer></script>
   ========================================================================== */

(function () {
    'use strict';

    var FALLBACK = {
        url: 'https://wa.me/qr/7OPJFROHEVRGM1',
        openInNewTab: true,
        addFooterIcon: true,
        labels: { ar: 'واتساب فراولة ستوديو' },
        footerIconClass: 'fa-brands fa-whatsapp',
        footerLinkClass: 'footer-whatsapp'
    };

    var CONFIG = window.FRAWALA_WHATSAPP || FALLBACK;
    var NEW_URL = CONFIG.url || FALLBACK.url;

    /* Any of these hosts/schemes is considered an old WhatsApp link. */
    function isWhatsAppHref(href) {
        if (!href) return false;

        var value = String(href).trim();

        if (/^whatsapp:/i.test(value)) return true;

        return /^(?:https?:)?\/\/(?:[a-z0-9-]+\.)?(?:wa\.me|whatsapp\.com)(?:[/?#]|$)/i.test(value);
    }

    function addRelToken(anchor, token) {
        var rel = (anchor.getAttribute('rel') || '')
            .split(/\s+/)
            .filter(Boolean);

        if (rel.indexOf(token) === -1) rel.push(token);
        anchor.setAttribute('rel', rel.join(' '));
    }

    function applyAnchor(anchor) {
        if (!anchor || anchor.tagName !== 'A') return;

        var href = anchor.getAttribute('href');
        if (!isWhatsAppHref(href)) return;

        if (anchor.getAttribute('href') !== NEW_URL) {
            anchor.setAttribute('href', NEW_URL);
        }

        if (CONFIG.openInNewTab !== false) {
            anchor.setAttribute('target', '_blank');
            addRelToken(anchor, 'noopener');
            addRelToken(anchor, 'noreferrer');
        }
    }

    function footerHasWhatsApp(social) {
        var links = social.querySelectorAll('a[href]');

        for (var i = 0; i < links.length; i++) {
            var href = links[i].getAttribute('href');
            if (href === NEW_URL || isWhatsAppHref(href)) return true;
        }

        return false;
    }

    function ensureFooterIcon() {
        if (CONFIG.addFooterIcon === false) return;

        var social = document.querySelector('.footer-social');
        if (!social || footerHasWhatsApp(social)) return;

        var link = document.createElement('a');
        link.setAttribute('href', NEW_URL);
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        link.setAttribute('aria-label', (CONFIG.labels && CONFIG.labels.ar) || 'WhatsApp');
        link.setAttribute('title', (CONFIG.labels && CONFIG.labels.ar) || 'WhatsApp');

        if (CONFIG.footerLinkClass) link.className = CONFIG.footerLinkClass;

        var icon = document.createElement('i');
        icon.className = CONFIG.footerIconClass || FALLBACK.footerIconClass;
        icon.setAttribute('aria-hidden', 'true');

        link.appendChild(icon);
        social.insertBefore(link, social.firstChild);
    }

    function scan(root) {
        var scope = root && root.querySelectorAll ? root : document;
        var anchors = scope.querySelectorAll('a[href]');

        Array.prototype.forEach.call(anchors, applyAnchor);

        if (root === document) ensureFooterIcon();
    }

    function watchForNewLinks() {
        if (!window.MutationObserver || !document.body) return;

        var observer = new MutationObserver(function (mutations) {
            var needsScan = false;

            for (var i = 0; i < mutations.length; i++) {
                var mutation = mutations[i];

                if (mutation.type === 'childList' && mutation.addedNodes.length) {
                    needsScan = true;
                    break;
                }

                if (mutation.type === 'attributes' && mutation.attributeName === 'href') {
                    var target = mutation.target;
                    if (target && target.tagName === 'A') {
                        var href = target.getAttribute('href');
                        // Ignore our own update; react only to a *different*
                        // WhatsApp link being introduced.
                        if (href !== NEW_URL && isWhatsAppHref(href)) {
                            needsScan = true;
                            break;
                        }
                    }
                }
            }

            if (needsScan) scan(document);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['href']
        });
    }

    function boot() {
        scan(document);
        ensureFooterIcon();
        watchForNewLinks();

        // Safety net for late-injected footers / widgets.
        window.setTimeout(function () { scan(document); }, 0);
        window.addEventListener('load', function () { scan(document); });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
