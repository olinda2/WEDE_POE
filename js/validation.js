/* ============================================================
   Reusable form validator used on BOTH forms
   (pre-order enquiry and contact).
   How it works:
   - Each field has a list of "rules". A rule is a function that
     returns true if the value is OK, or an error message if its not.
   - Errors show under the field in red.
   - Fields are checked when the visitor leaves them.
   ============================================================ */
(function () {
    'use strict';

    /* Rules */
    const rules = {
        required: function (message) {
            return function (value) {
                return value.trim() !== '' || (message || 'This field is required.');
            };
        },
        minLength: function (min, message) {
            return function (value) {
                return value.trim() === '' || value.trim().length >= min ||
                    (message || 'Please enter at least ' + min + ' characters.');
            };
        },
        maxLength: function (max, message) {
            return function (value) {
                return value.length <= max || (message || 'Please keep this under ' + max + ' characters.');
            };
        },
        email: function (message) {
            return function (value) {
                return value.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim()) ||
                    (message || 'Please enter a valid email address, like name@example.com.');
            };
        },
        // South African numbers: 0 or +27, then 9 digits. Spaces, dashes and brackets are allowed.
        phone: function (message) {
            return function (value) {
                const cleaned = value.replace(/[\s\-()]/g, '');
                return value.trim() === '' || /^(?:\+27|0)[1-8]\d{8}$/.test(cleaned) ||
                    (message || 'Please enter a valid South African number, like 082 123 4567 or +27 82 123 4567.');
            };
        },
        // Letters (including accents), spaces, apostrophes, dots and hyphens
        personName: function (message) {
            return function (value) {
                return value.trim() === '' || /^[\p{L}][\p{L}\s'.\-]{1,59}$/u.test(value.trim()) ||
                    (message || 'Please use letters only for your name (2 to 60 characters).');
            };
        },
        // Whole number between min and max
        wholeNumber: function (min, max, message) {
            return function (value) {
                const n = Number(value);
                return value.trim() === '' || (Number.isInteger(n) && n >= min && n <= max) ||
                    (message || 'Please enter a whole number from ' + min + ' to ' + max + '.');
            };
        }
    };

    /* Validator */
    function FormValidator(form, fields, summaryElement) {
        const self = this;
        this.form = form;
        this.fields = fields;
        this.summary = summaryElement || null;
        form.noValidate = true; // use our messages instead of the browser's

        fields.forEach(function (field) {
            field.input = document.getElementById(field.id);
            const input = field.input;
            const instantCheck = input.tagName === 'SELECT' || input.type === 'checkbox' || input.type === 'date' || input.type === 'time';

            // Check when the visitor leaves the field
            input.addEventListener(instantCheck ? 'change' : 'blur', function () { self.validateField(field); });

            input.addEventListener('input', function () {
                if (input.getAttribute('aria-invalid') === 'true') { self.validateField(field); }
            });
        });
    }

    FormValidator.prototype.validateField = function (field) {
        const input = field.input;
        const value = input.type === 'checkbox' ? (input.checked ? 'yes' : '') : input.value;

        for (let i = 0; i < field.rules.length; i++) {
            const result = field.rules[i](value, input, this.form);
            if (result !== true) {
                this.showError(field, result);
                return false;
            }
        }
        this.clearError(field);
        return true;
    };

    FormValidator.prototype.showError = function (field, message) {
        const output = document.getElementById(field.id + '-error');
        if (output) { output.textContent = message; }
        field.input.setAttribute('aria-invalid', 'true');
        field.input.classList.add('invalid');
    };

    FormValidator.prototype.clearError = function (field) {
        const output = document.getElementById(field.id + '-error');
        if (output) { output.textContent = ''; }
        field.input.removeAttribute('aria-invalid');
        field.input.classList.remove('invalid');
    };

    /* Check every field. Returns true only if all of them pass. */
    FormValidator.prototype.validateAll = function () {
        const self = this;
        const problems = this.fields.filter(function (field) { return !self.validateField(field); });

        if (this.summary) {
            if (problems.length === 0) {
                this.summary.hidden = true;
                this.summary.textContent = '';
            } else {
                this.summary.hidden = false;
                this.summary.textContent = 'Please fix ' + problems.length + (problems.length === 1 ? ' field' : ' fields') +
                    ' before sending: ' + problems.map(function (f) { return f.label; }).join(', ') + '.';
            }
        }
        if (problems.length > 0) { problems[0].input.focus(); }
        return problems.length === 0;
    };

    /* Clear every error (used when the form is reset) */
    FormValidator.prototype.reset = function () {
        const self = this;
        this.fields.forEach(function (field) { self.clearError(field); });
        if (this.summary) { this.summary.hidden = true; this.summary.textContent = ''; }
    };

    /* counter under the textarea */
    function attachCounter(input, counterId, max) {
        const counter = document.getElementById(counterId);
        if (!counter) { return function () {}; }
        function update() { counter.textContent = input.value.length + ' / ' + max + ' characters'; }
        input.addEventListener('input', update);
        update();
        return update;
    }

    VE.rules = rules;
    VE.FormValidator = FormValidator;
    VE.attachCounter = attachCounter;
})();