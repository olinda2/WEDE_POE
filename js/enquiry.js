/* ============================================================
   pre-order page script, what it does:
   - Loads prices and opening hours from the JSON files (AJAX)
   - Shows the extras (add-ons) that suit the chosen item
   - Keeps a real time estimated total as the visitor chooses
   - Validates each field
   - Calculates the cost and availability of the order
   - Sends the order to a server(test) with fetch() (AJAX)
   ============================================================ */
(async function () {
    'use strict';

    const form = document.getElementById('enquiry-form');
    if (!form) { return; }

    const el = VE.el;
    const rules = VE.rules;

    // A free "fake" API that accepts POST requests (It does not store anything)
    const ENDPOINT = 'https://jsonplaceholder.typicode.com/posts';
    const LEAD_MINUTES = 15;   // orders need at least 15 minutes notice when picked up today
    const MAX_DAYS_AHEAD = 14; // how far ahead a customer can order

    // Elements on the page
    const branchSelect = document.getElementById('branch');
    const itemSelect = document.getElementById('item');
    const quantityInput = document.getElementById('quantity');
    const dateInput = document.getElementById('pickup-date');
    const timeInput = document.getElementById('pickup-time');
    const addonsList = document.getElementById('addons-list');
    const totalOutput = document.getElementById('live-total');
    const submitButton = form.querySelector('button[type="submit"]');
    const responseBox = document.getElementById('enquiry-response');
    const loadError = document.getElementById('enquiry-load-error');

    /* Load the data */
    let menu;
    let branchData;
    try {
        const results = await Promise.all([VE.loadJSON('data/menu.json'), VE.loadJSON('data/branches.json')]);
        menu = results[0];
        branchData = results[1];
    } catch (error) {
        console.warn(error.message);
        loadError.hidden = false; // tells the visitor something went wrong
        submitButton.disabled = true;
        return;
    }

    function findItem(id) { return menu.items.find(function (i) { return i.id === id; }); }
    function findBranch(id) { return branchData.branches.find(function (b) { return b.id === id; }); }
    function weekdayName(date) { return new Intl.DateTimeFormat('en-ZA', { weekday: 'long' }).format(date); }
    function isSameDay(a, b) { return VE.toDateInputValue(a) === VE.toDateInputValue(b); }

    /* Date limits */
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastDay = new Date(today);
    lastDay.setDate(lastDay.getDate() + MAX_DAYS_AHEAD);
    dateInput.min = VE.toDateInputValue(today);
    dateInput.max = VE.toDateInputValue(lastDay);

    /* Add-ons that suit the chosen item */
    function renderAddons() {
        addonsList.replaceChildren();
        const item = findItem(itemSelect.value);
        if (!item) {
            addonsList.append(el('p', { className: 'field-hint', text: 'Choose an item first to see the extras you can add.' }));
            return;
        }
        item.addons.forEach(function (id) {
            const addon = menu.addons[id];
            const inputId = 'addon-' + id;
            const price = addon.price > 0 ? '(+' + VE.formatMoney(addon.price, menu.currency) + ' each)' : '(free)';
            addonsList.append(el('div', { className: 'checkbox-row' },
                el('input', { type: 'checkbox', id: inputId, name: 'addons', value: id, onchange: updateTotal }),
                el('label', { for: inputId, text: addon.label + ' ' + price })
            ));
        });
    }

    function selectedAddons() {
        return Array.from(addonsList.querySelectorAll('input:checked')).map(function (box) { return box.value; });
    }

    /* build the price lines and the total */
    function buildQuote(itemId, quantity, addonIds) {
        const item = findItem(itemId);
        const lines = [{ label: item.name, quantity: quantity, unit: item.price, total: item.price * quantity }];
        addonIds.forEach(function (id) {
            const addon = menu.addons[id];
            lines.push({ label: addon.label, quantity: quantity, unit: addon.price, total: addon.price * quantity });
        });
        const total = lines.reduce(function (sum, line) { return sum + line.total; }, 0);
        return { lines: lines, total: total };
    }

    // Real time total calculation
    function updateTotal() {
        const quantity = Number(quantityInput.value);
        if (!findItem(itemSelect.value) || !Number.isInteger(quantity) || quantity < 1) {
            totalOutput.textContent = VE.formatMoney(0, menu.currency);
            return;
        }
        totalOutput.textContent = VE.formatMoney(buildQuote(itemSelect.value, quantity, selectedAddons()).total, menu.currency);
    }

    /* Availability */
    function checkAvailability(item, branch, date, time) {
        const hours = VE.hoursFor(branch, date);
        const open = VE.toMinutes(hours[0]);
        const close = VE.toMinutes(hours[1]);
        const from = item.available.from ? Math.max(open, VE.toMinutes(item.available.from)) : open;
        const until = item.available.until ? Math.min(close, VE.toMinutes(item.available.until)) : close;
        const wanted = VE.toMinutes(time);
        return { ok: wanted >= from && wanted <= until, from: VE.fromMinutes(from), until: VE.fromMinutes(until) };
    }

    /* some Validation rules */
    function dateRule(value) {
        if (value.trim() === '') { return true; }
        const date = VE.parseDateInput(value);
        if (date < today) { return 'Please choose today or a future date.'; }
        if (date > lastDay) { return 'We can only take pre-orders up to ' + MAX_DAYS_AHEAD + ' days ahead.'; }
        const branch = findBranch(branchSelect.value);
        if (branch && !VE.hoursFor(branch, date)) {
            return 'The ' + branch.shortName + ' branch is closed on ' + weekdayName(date) + 's. Please pick another day or branch.';
        }
        return true;
    }

    function timeRule(value) {
        if (value.trim() === '' || dateInput.value === '') { return true; }
        const branch = findBranch(branchSelect.value);
        if (!branch) { return true; }
        const date = VE.parseDateInput(dateInput.value);
        const hours = VE.hoursFor(branch, date);
        if (!hours) { return true; }
        const wanted = VE.toMinutes(value);
        if (wanted < VE.toMinutes(hours[0]) || wanted > VE.toMinutes(hours[1])) {
            return 'The ' + branch.shortName + ' branch is open from ' + hours[0] + ' to ' + hours[1] + ' on ' + weekdayName(date) + 's. Please choose a time in that range.';
        }
        const now = new Date();
        if (isSameDay(date, now) && wanted < now.getHours() * 60 + now.getMinutes() + LEAD_MINUTES) {
            return 'Please allow at least ' + LEAD_MINUTES + ' minutes. Choose a later time today.';
        }
        return true;
    }

    const validator = new VE.FormValidator(form, [
        { id: 'fname', label: 'Full name', rules: [rules.required('Please enter your full name.'), rules.personName()] },
        { id: 'email', label: 'Email address', rules: [rules.required('Please enter your email address.'), rules.email()] },
        { id: 'phone', label: 'Phone number', rules: [rules.required('Please enter your phone number.'), rules.phone()] },
        { id: 'branch', label: 'Branch', rules: [rules.required('Please choose the branch where you will collect.')] },
        { id: 'item', label: 'Item', rules: [rules.required('Please choose an item.')] },
        { id: 'quantity', label: 'Quantity', rules: [rules.required('Please enter how many you would like.'), rules.wholeNumber(1, 20)] },
        { id: 'pickup-date', label: 'Pickup date', rules: [rules.required('Please choose a pickup date.'), dateRule] },
        { id: 'pickup-time', label: 'Pickup time', rules: [rules.required('Please choose a pickup time.'), timeRule] },
        { id: 'notes', label: 'Special instructions', rules: [rules.maxLength(200, 'Please keep special instructions under 200 characters.')] },
        { id: 'consent', label: 'Permission to contact you', rules: [function (value) { return value === 'yes' || 'Please tick the box so we can contact you about your order.'; }] }
    ], document.getElementById('enquiry-summary'));

    VE.attachCounter(document.getElementById('notes'), 'notes-counter', 200);

    // When the branch, day or item changes,this re-checks the fields that depend on them
    function recheckDependentFields() {
        validator.fields.forEach(function (field) {
            if ((field.id === 'pickup-date' || field.id === 'pickup-time') && field.input.value !== '') {
                validator.validateField(field);
            }
        });
    }
    branchSelect.addEventListener('change', recheckDependentFields);
    dateInput.addEventListener('change', recheckDependentFields);
    itemSelect.addEventListener('change', function () { renderAddons(); updateTotal(); });
    quantityInput.addEventListener('input', updateTotal);

    /* Send the order with fetch() (AJAX) */
    async function sendOrder(payload) {
        const controller = new AbortController();
        const timer = setTimeout(function () { controller.abort(); }, 8000);
        try {
            const response = await fetch(ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json; charset=UTF-8' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            return response.ok;
        } finally {
            clearTimeout(timer);
        }
    }

    function quoteTable(quote) {
        const rows = quote.lines.map(function (line) {
            return el('tr', null,
                el('td', { text: line.label }),
                el('td', { text: line.quantity + ' \u00D7 ' + VE.formatMoney(line.unit, menu.currency) }),
                el('td', { className: 'amount', text: VE.formatMoney(line.total, menu.currency) })
            );
        });
        return el('table', { className: 'quote-table' },
            el('caption', { className: 'visually-hidden', text: 'Price breakdown' }),
            el('tbody', null, rows),
            el('tfoot', null, el('tr', null,
                el('th', { scope: 'row', colspan: '2', text: 'Estimated total' }),
                el('td', { className: 'amount', text: VE.formatMoney(quote.total, menu.currency) })
            ))
        );
    }

    function showResponse(type, children) {
        responseBox.className = 'form-response is-' + type;
        responseBox.replaceChildren.apply(responseBox, children);
        responseBox.hidden = false;
        responseBox.focus();
        responseBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function showAvailable(order, quote, reference, sent) {
        const branch = findBranch(order.branch);
        const date = VE.parseDateInput(order.date);
        const statusLine = sent
            ? el('p', { className: 'response-status', text: 'Your enquiry has been sent to our team.' })
            : el('p', { className: 'response-status is-warning', text: 'We could not reach our order server just now. Please call ' + branchData.phone + ' to confirm your order.' });

        showResponse('success', [
            el('h2', { text: 'Good news, ' + order.firstName + '! Your order is available.' }),
            el('p', { text: 'Everything on your order is available at the ' + branch.name + ' on ' + VE.formatDate(date) + ' at ' + order.time + '. We will have it ready when you arrive.' }),
            quoteTable(quote),
            el('p', { className: 'response-note', text: 'Pay at the counter when you collect. Online payment is coming soon.' }),
            statusLine,
            el('p', { className: 'response-ref' }, 'Your reference: ', el('strong', { text: reference })),
            el('button', {
                type: 'button',
                className: 'secondary-button',
                text: 'Start a new order',
                onclick: function () {
                    form.reset();
                    validator.reset();
                    renderAddons();
                    updateTotal();
                    responseBox.hidden = true;
                    form.querySelector('input').focus();
                }
            })
        ]);
    }

    function showUnavailable(order, item, quote, availability) {
        const branch = findBranch(order.branch);
        const date = VE.parseDateInput(order.date);
        showResponse('warning', [
            el('h2', { text: 'Sorry, ' + order.firstName + ', that time will not work.' }),
            el('p', { text: item.name + ' is only available at the ' + branch.shortName + ' branch between ' + availability.from + ' and ' + availability.until + ' on ' + weekdayName(date) + 's. ' + item.available.note + '.' }),
            el('p', { text: 'Please choose a pickup time between ' + availability.from + ' and ' + availability.until + ', or pick a different item. For reference, this order would cost:' }),
            quoteTable(quote),
            el('button', {
                type: 'button',
                className: 'secondary-button',
                text: 'Change my pickup time',
                onclick: function () { timeInput.focus(); timeInput.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
            })
        ]);
    }

    /* Submission */
    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        responseBox.hidden = true;

        if (!validator.validateAll()) { return; }

        const order = {
            firstName: document.getElementById('fname').value.trim().split(/\s+/)[0],
            name: document.getElementById('fname').value.trim(),
            branch: branchSelect.value,
            item: itemSelect.value,
            quantity: Number(quantityInput.value),
            addons: selectedAddons(),
            date: dateInput.value,
            time: timeInput.value,
            notes: document.getElementById('notes').value.trim()
        };

        const item = findItem(order.item);
        const quote = buildQuote(order.item, order.quantity, order.addons);
        const availability = checkAvailability(item, findBranch(order.branch), VE.parseDateInput(order.date), order.time);

        if (!availability.ok) {
            showUnavailable(order, item, quote, availability);
            return;
        }

        // if available, send it (AJAX) and show the confirmation
        const reference = 'VE-' + Math.random().toString(36).slice(2, 8).toUpperCase();
        const originalText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Checking availability...';

        let sent = false;
        try {
            // Only the order details go to the test server
            sent = await sendOrder({ reference: reference, name: order.name, branch: order.branch, item: order.item, quantity: order.quantity, addons: order.addons, date: order.date, time: order.time, notes: order.notes, total: quote.total });
        } catch (error) {
            console.warn('Order could not be sent:', error.message);
        }

        submitButton.disabled = false;
        submitButton.textContent = originalText;
        showAvailable(order, quote, reference, sent);
    });

    const wantedItem = new URLSearchParams(window.location.search).get('item');
    if (wantedItem && findItem(wantedItem)) { itemSelect.value = wantedItem; }
    renderAddons();
    updateTotal();
})();
