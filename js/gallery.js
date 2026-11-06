/* ============================================================
   here we have the funcionalities of the gallery section
   ============================================================ */
(function () {
    'use strict';

    const links = Array.from(document.querySelectorAll('.gallery a'));
    if (links.length === 0 || typeof HTMLDialogElement !== 'function') { return; }

    const el = VE.el;
    let current = 0;

    // Build the lightbox once and add it to the page
    const image = el('img', { className: 'lightbox-image', alt: '' });
    const caption = el('figcaption', { className: 'lightbox-caption' });
    const counter = el('p', { className: 'lightbox-count', 'aria-live': 'polite' });
    const closeButton = el('button', { type: 'button', className: 'lightbox-close', 'aria-label': 'Close image viewer', text: '\u00D7' });
    const prevButton = el('button', { type: 'button', className: 'lightbox-nav lightbox-prev', 'aria-label': 'Previous image', text: '\u2039' });
    const nextButton = el('button', { type: 'button', className: 'lightbox-nav lightbox-next', 'aria-label': 'Next image', text: '\u203A' });

    const dialog = el('dialog', { className: 'lightbox', 'aria-label': 'Image viewer' },
        closeButton,
        prevButton,
        el('figure', { className: 'lightbox-figure' }, image, caption),
        nextButton,
        counter
    );
    document.body.append(dialog);

    // Show the image number
    function show(index) {
        current = (index + links.length) % links.length;
        const link = links[current];
        const thumb = link.querySelector('img');
        image.src = link.getAttribute('href');
        image.alt = thumb ? thumb.alt : '';
        caption.textContent = link.dataset.caption || (thumb ? thumb.alt : '');
        counter.textContent = 'Image ' + (current + 1) + ' of ' + links.length;
    }

    links.forEach(function (link, index) {
        link.addEventListener('click', function (event) {
            event.preventDefault();
            show(index);
            dialog.showModal();
            closeButton.focus();
        });
    });

    closeButton.addEventListener('click', function () { dialog.close(); });
    prevButton.addEventListener('click', function () { show(current - 1); });
    nextButton.addEventListener('click', function () { show(current + 1); });

    // Clicking the dark area around the picture closes the lightbox
    dialog.addEventListener('click', function (event) {
        if (event.target === dialog) { dialog.close(); }
    });

    // Left and right arrow keys to move between images
    dialog.addEventListener('keydown', function (event) {
        if (event.key === 'ArrowLeft') { show(current - 1); }
        if (event.key === 'ArrowRight') { show(current + 1); }
    });
})();
