/* ============================================================================
   FRAWALA STUDIO — WHATSAPP CONFIGURATION
   File : updated/updated-whatsapp-config.js

   Single source of truth for every WhatsApp link on the site.
   Change `url` here once and the floating contact button, the footer social
   icon and any dynamically added WhatsApp link will all use the new value.

   Load BEFORE updated/updated-whatsapp-link.js (defer keeps this order):
       <script src="updated/updated-whatsapp-config.js" defer></script>
       <script src="updated/updated-whatsapp-link.js" defer></script>
   ========================================================================== */

window.FRAWALA_WHATSAPP = Object.freeze({
    /* Official WhatsApp link (QR) */
    url: 'https://wa.me/qr/7OPJFROHEVRGM1',

    /* Open every WhatsApp link in a new, safe tab. */
    openInNewTab: true,

    /* Add a WhatsApp icon to .footer-social if it is missing. */
    addFooterIcon: true,

    labels: {
        ar: 'واتساب فراولة ستوديو',
        en: 'Frawala Studio on WhatsApp'
    },

    footerIconClass: 'fa-brands fa-whatsapp',
    footerLinkClass: 'footer-whatsapp'
});
