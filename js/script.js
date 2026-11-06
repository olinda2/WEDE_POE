/* ============================================================
   Main script of the code (loads on every page)
   1. Adds a "js" class so the CSS knows JavaScript is working
   2. Accordion (used for the FAQ on the contact page)
   3. Scroll animations
   ============================================================ */
(function () {
    'use strict';

    document.documentElement.classList.add('js');

    /* Accordion
       Each accordion button controls one panel. I updated
       aria-expanded so screen readers know if it is open or closed. */
    function setPanel(button, open) {
        const panel = document.getElementById(button.getAttribute('aria-controls'));
        if (!panel) { return; }
        button.setAttribute('aria-expanded', String(open));
        panel.dataset.open = String(open);
        // "inert" stops keyboard focus going into a closed panel
        if (open) { panel.removeAttribute('inert'); } else { panel.setAttribute('inert', ''); }
    }

    function initAccordions() {
        document.querySelectorAll('.accordion').forEach(function (accordion) {
            const buttons = Array.from(accordion.querySelectorAll('.accordion-trigger'));

            buttons.forEach(function (button, index) {
                // Start state comes from the HTML (aria-expanded="true" = open)
                setPanel(button, button.getAttribute('aria-expanded') === 'true');

                button.addEventListener('click', function () {
                    setPanel(button, button.getAttribute('aria-expanded') !== 'true');
                });

                // Keyboard support - Up/Down arrows, Home and End move between headings
                button.addEventListener('keydown', function (event) {
                    let target = null;
                    if (event.key === 'ArrowDown') { target = buttons[(index + 1) % buttons.length]; }
                    if (event.key === 'ArrowUp') { target = buttons[(index - 1 + buttons.length) % buttons.length]; }
                    if (event.key === 'Home') { target = buttons[0]; }
                    if (event.key === 'End') { target = buttons[buttons.length - 1]; }
                    if (target) { event.preventDefault(); target.focus(); }
                });
            });
        });
    }

    /* Scroll Animations */
    function initScrollReveal() {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!('IntersectionObserver' in window) || reducedMotion) { return; }

        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });

        const targets = document.querySelectorAll(
            'main > section, .branch, .team-member, .gallery li, .accordion-item'
        );
        targets.forEach(function (target) {
            if (target.getBoundingClientRect().top > window.innerHeight) {
                target.classList.add('reveal');
                observer.observe(target);
            }
        });
    }

    initAccordions();
    initScrollReveal();
})();
