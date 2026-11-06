/* ============================================================
  contact page script, what it does:
   - Validates the contact form
   - Compiles the details into an email for the recipient
    and shows a preview
   - Lets the visitor send it with their own email app
    or copy the text
   ============================================================ */
(function () {
    'use strict';

    const form = document.getElementById('contact-form');
    if (!form) { return; }

    const el = VE.el;
    const rules = VE.rules;

    // The email address that receives the message
    const RECIPIENT = 'hello@velocespresso.co.za';

    const messageInput = document.getElementById('message');
    const preview = document.getElementById('email-preview');

    const validator = new VE.FormValidator(form, [
        { id: 'name', label: 'Full name', rules: [rules.required('Please enter your full name.'), rules.personName()] },
        { id: 'email-contact', label: 'Email address', rules: [rules.required('Please enter your email address.'), rules.email()] },
        { id: 'phone-contact', label: 'Phone number', rules: [rules.phone()] }, // optional, but must be valid if filled in
        { id: 'message-type', label: 'Type of message', rules: [rules.required('Please choose the type of message.')] },
        {
            id: 'message', label: 'Message', rules: [
                rules.required('Please type your message.'),
                rules.minLength(10, 'Your message is a bit short. Please write at least 10 characters.'),
                rules.maxLength(1000, 'Please keep your message under 1000 characters.')
            ]
        }
    ], document.getElementById('contact-summary'));

    VE.attachCounter(messageInput, 'message-counter', 1000);

    /* Put the form details together as an email */
    function compileEmail(data) {
        const subject = '[Veloce Espresso website] ' + data.type + ' from ' + data.name;
        const lines = [
            'Hi Veloce Espresso team,',
            '',
            'Message type: ' + data.type,
            'Name: ' + data.name,
            'Email: ' + data.email
        ];
        if (data.phone) { lines.push('Phone: ' + data.phone); }
        lines.push('', 'Message:', data.message, '', 'Sent from the Veloce Espresso website contact form.');

        const body = lines.join('\n');
        // encodeURIComponent makes the text safe to put inside a link
        const link = 'mailto:' + RECIPIENT +
            '?subject=' + encodeURIComponent(subject) +
            '&body=' + encodeURIComponent(body.replace(/\n/g, '\r\n'));
        return { subject: subject, body: body, link: link };
    }

    function showPreview(email) {
        const copyNote = el('span', { className: 'copy-note', role: 'status' });

        const copyButton = el('button', {
            type: 'button',
            className: 'secondary-button',
            text: 'Copy email text',
            onclick: function () {
                const text = 'To: ' + RECIPIENT + '\nSubject: ' + email.subject + '\n\n' + email.body;
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).then(
                        function () { copyNote.textContent = 'Copied!'; },
                        function () { copyNote.textContent = 'Could not copy. Please select the text and copy it.'; }
                    );
                } else {
                    copyNote.textContent = 'Copying is not supported here. Please select the text and copy it.';
                }
            }
        });

        const editButton = el('button', {
            type: 'button',
            className: 'secondary-button',
            text: 'Edit my message',
            onclick: function () { preview.hidden = true; messageInput.focus(); }
        });

        preview.className = 'form-response is-success';
        preview.replaceChildren(
            el('h2', { text: 'Your email is ready to send' }),
            el('p', { text: 'Check the details below. When you press the button, your email app opens with everything filled in, and you just press Send.' }),
            el('dl', { className: 'email-details' },
                el('dt', { text: 'To' }), el('dd', { text: RECIPIENT }),
                el('dt', { text: 'Subject' }), el('dd', { text: email.subject })
            ),
            el('pre', { className: 'email-body', text: email.body }),
            el('div', { className: 'response-actions' },
                el('a', { className: 'cta-button', href: email.link, text: 'Open in my email app' }),
                copyButton,
                editButton,
                copyNote
            )
        );
        preview.hidden = false;
        preview.focus();
        preview.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        preview.hidden = true;
        if (!validator.validateAll()) { return; }

        showPreview(compileEmail({
            name: document.getElementById('name').value.trim(),
            email: document.getElementById('email-contact').value.trim(),
            phone: document.getElementById('phone-contact').value.trim(),
            type: document.getElementById('message-type').value,
            message: messageInput.value.trim()
        }));
    });
})();
