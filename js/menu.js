/* ============================================================
   this script is for menu page, it Loads the menu
   from data/menu.json and builds the page with
   JavaScript, then adds search, category filter and sorting.

   If the JSON can't load, the plain HTML menu already on the
   page stays visible, so visitors always see the menu.
   ============================================================ */
(async function () {
    'use strict';

    const list = document.getElementById('menu-list');
    const tools = document.getElementById('menu-tools');
    if (!list || !tools) { return; }

    const el = VE.el;
    let menu;

    try {
        menu = await VE.loadJSON('data/menu.json');
    } catch (error) {
        console.warn(error.message);
        return; // keep the static menu
    }

    const searchInput = document.getElementById('menu-search');
    const sortSelect = document.getElementById('menu-sort');
    const filterBox = document.getElementById('menu-filters');
    const status = document.getElementById('menu-status');

    // This object remembers what the visitor has chosen
    const state = { query: '', category: 'all', sort: 'default' };

    /* Category filter buttons */
    function buildFilterButtons() {
        const choices = [{ id: 'all', name: 'All' }].concat(menu.categories);
        choices.forEach(function (choice) {
            const button = el('button', {
                type: 'button',
                className: 'filter-button',
                'aria-pressed': String(choice.id === state.category),
                text: choice.name,
                onclick: function () {
                    state.category = choice.id;
                    filterBox.querySelectorAll('button').forEach(function (b) {
                        b.setAttribute('aria-pressed', String(b === button));
                    });
                    render();
                }
            });
            filterBox.append(button);
        });
    }

    /* Check if an item match the search words */
    function matchesQuery(item) {
        if (state.query === '') { return true; }
        const category = menu.categories.find(function (c) { return c.id === item.category; });
        const text = [item.name, item.description, item.tags.join(' '), category ? category.name : '']
            .join(' ').toLowerCase();
        const words = text.split(/[^a-z0-9]+/);

        return state.query.split(/\s+/).every(function (typed) {
            return words.some(function (word) { return word.indexOf(typed) === 0; });
        });
    }

    function sortItems(items) {
        const sorted = items.slice();
        if (state.sort === 'price-asc') { sorted.sort(function (a, b) { return a.price - b.price; }); }
        if (state.sort === 'price-desc') { sorted.sort(function (a, b) { return b.price - a.price; }); }
        if (state.sort === 'name') { sorted.sort(function (a, b) { return a.name.localeCompare(b.name); }); }
        return sorted;
    }

    function buildItem(item) {
        const textBlock = el('div', { className: 'menu-item-text' },
            el('h3', { text: item.name }),
            el('p', { text: item.description }),
            el('p', { className: 'menu-item-note', text: item.available.note }),
            el('a', { className: 'menu-link', href: 'pre-order.html?item=' + encodeURIComponent(item.id), text: 'Pre-order this \u2192' })
        );
        return el('article', { className: 'menu-item' },
            el('img', { src: item.image, alt: item.alt, width: item.width, height: item.height, loading: 'lazy' }),
            textBlock,
            el('span', { className: 'price', text: VE.formatMoney(item.price, menu.currency) })
        );
    }

    function render() {
        const visible = menu.items.filter(function (item) {
            return (state.category === 'all' || item.category === state.category) && matchesQuery(item);
        });

        list.replaceChildren();

        menu.categories.forEach(function (category) {
            const inCategory = sortItems(visible.filter(function (item) { return item.category === category.id; }));
            if (inCategory.length === 0) { return; }
            list.append(el('section', { className: 'menu-category' },
                el('h2', { text: category.name }),
                inCategory.map(buildItem)
            ));
        });

        if (visible.length === 0) {
            list.append(el('p', { className: 'no-results' },
                'Sorry, nothing on the menu matches that. ',
                el('button', {
                    type: 'button',
                    className: 'link-button',
                    text: 'Clear search and filters',
                    onclick: function () {
                        state.query = ''; state.category = 'all'; searchInput.value = '';
                        filterBox.querySelectorAll('button').forEach(function (b, i) { b.setAttribute('aria-pressed', String(i === 0)); });
                        render();
                    }
                })
            ));
        }

        status.textContent = 'Showing ' + visible.length + ' of ' + menu.items.length + ' items';
    }

    /* Events */
    let timer;
    searchInput.addEventListener('input', function () {
        clearTimeout(timer); // wait until the visitor stops typing for a moment
        timer = setTimeout(function () {
            state.query = searchInput.value.trim().toLowerCase();
            render();
        }, 150);
    });

    sortSelect.addEventListener('change', function () {
        state.sort = sortSelect.value;
        render();
    });

    buildFilterButtons();
    tools.hidden = false; // the controls only appear when JavaScript is working
    render();
})();
