/* ==========================================================
   What this script does:
   - Draws an interactive Leaflet map with a marker for each
     branch (the branch details come from data/branches.json)
   - Shows whether each branch is open or closed on the map
   ========================================================== */
(async function () {
    'use strict';

    const mapElement = document.getElementById('branch-map');
    if (!mapElement) { return; }

    const el = VE.el;
    let data;

    try {
        data = await VE.loadJSON('data/branches.json');
    } catch (error) {
        console.warn(error.message);
        return; // The page still shows the addresses and hours as normal text
    }

    data.branches.forEach(function (branch) {
        const status = document.querySelector('[data-status-for="' + branch.id + '"]');
        if (!status) { return; }
        const info = VE.openStatus(branch);
        status.textContent = info.text;
        status.classList.toggle('is-open', info.open);
    });

    // 2. Builds the map
    if (typeof L === 'undefined') { return; }

    const map = L.map(mapElement, { scrollWheelZoom: false });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
    }).addTo(map);

    const markers = {};

    data.branches.forEach(function (branch) {
        // What shows inside the popup when you click a marker
        const directions = el('a', {
            href: 'https://www.google.com/maps/dir/?api=1&destination=' + branch.lat + ',' + branch.lng,
            target: '_blank',
            rel: 'noopener noreferrer',
            text: 'Get directions'
        });
        const popup = el('div', { className: 'map-popup' },
            el('strong', { text: branch.name }),
            el('br'),
            branch.address,
            el('br'),
            VE.openStatus(branch).text,
            el('br'),
            directions
        );

        markers[branch.id] = L.marker([branch.lat, branch.lng], { title: branch.name, alt: branch.name })
            .addTo(map)
            .bindPopup(popup);
    });

    // Zoom the map so both branches fit on screen
    const allPoints = data.branches.map(function (b) { return [b.lat, b.lng]; });
    map.fitBounds(allPoints, { padding: [60, 60] });

    // When a visitor clicks the "Show on map" button, it zooms to that branch and opens its popup
    document.querySelectorAll('[data-show-on-map]').forEach(function (button) {
        button.addEventListener('click', function () {
            const id = button.dataset.showOnMap;
            const branch = data.branches.find(function (b) { return b.id === id; });
            if (!branch) { return; }
            mapElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            map.flyTo([branch.lat, branch.lng], 16);
            markers[id].openPopup();
        });
    });

    // Scroll-wheel zoom only works once the map is clicked, so the page can still scroll normally
    map.on('focus', function () { map.scrollWheelZoom.enable(); });
    map.on('blur', function () { map.scrollWheelZoom.disable(); });
})();