/* ====================================================
   Small helper functions that the other scripts share.
   ==================================================== */
(function () {
    'use strict';

    const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

    /* AJAX helper: fetch a JSON file and return the data.
       Throws an error if the file can't be loaded. */
    async function loadJSON(url) {
        const response = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!response.ok) {
            throw new Error('Could not load ' + url + ' (status ' + response.status + ')');
        }
        return response.json();
    }

    /* Makes time comparisons easy */
    function toMinutes(time) {
        const parts = time.split(':').map(Number);
        return parts[0] * 60 + parts[1];
    }

    function fromMinutes(total) {
        const h = String(Math.floor(total / 60)).padStart(2, '0');
        const m = String(total % 60).padStart(2, '0');
        return h + ':' + m;
    }

    function formatMoney(amount, currency) {
        return (currency || 'R') + ' ' + Number(amount).toFixed(2);
    }

    /* Opening hours of a branch on a given date */
    function hoursFor(branch, date) {
        return branch.hours[DAY_KEYS[date.getDay()]] || null;
    }

    /* check if the branch is open at that moment */
    function openStatus(branch, now) {
        now = now || new Date();
        const hours = hoursFor(branch, now);
        if (!hours) {
            return { open: false, text: 'Closed today' };
        }
        const minutes = now.getHours() * 60 + now.getMinutes();
        if (minutes >= toMinutes(hours[0]) && minutes < toMinutes(hours[1])) {
            return { open: true, text: 'Open now - closes at ' + hours[1] };
        }
        if (minutes < toMinutes(hours[0])) {
            return { open: false, text: 'Closed - opens today at ' + hours[0] };
        }
        return { open: false, text: 'Closed for today' };
    }

    function parseDateInput(value) {
        const parts = value.split('-').map(Number);
        return new Date(parts[0], parts[1] - 1, parts[2]);
    }

    function toDateInputValue(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + d;
    }

    function formatDate(date) {
        return new Intl.DateTimeFormat('en-ZA', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
        }).format(date);
    }

    /* DOM helper (I'm using textContent instead of innerHTML so user input can't inject HTML) */
    function el(tag, props) {
        const node = document.createElement(tag);
        const children = Array.prototype.slice.call(arguments, 2);

        Object.keys(props || {}).forEach(function (key) {
            const value = props[key];
            if (value === null || value === undefined || value === false) { return; }
            if (key === 'className') { node.className = value; }
            else if (key === 'text') { node.textContent = value; }
            else if (key.indexOf('on') === 0 && typeof value === 'function') {
                node.addEventListener(key.slice(2).toLowerCase(), value);
            }
            else { node.setAttribute(key, value === true ? '' : value); }
        });

        children.forEach(function append(child) {
            if (child === null || child === undefined || child === false) { return; }
            if (Array.isArray(child)) { child.forEach(append); return; }
            node.append(child.nodeType ? child : document.createTextNode(String(child)));
        });
        return node;
    }

    window.VE = {
        DAY_KEYS: DAY_KEYS,
        loadJSON: loadJSON,
        toMinutes: toMinutes,
        fromMinutes: fromMinutes,
        formatMoney: formatMoney,
        hoursFor: hoursFor,
        openStatus: openStatus,
        parseDateInput: parseDateInput,
        toDateInputValue: toDateInputValue,
        formatDate: formatDate,
        el: el
    };
})();