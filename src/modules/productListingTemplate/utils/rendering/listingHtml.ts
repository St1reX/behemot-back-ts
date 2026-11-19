import sanitizeHtml from 'sanitize-html';

export function escapeListingText(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function sanitizeListingHtml(value: string): string {
    return sanitizeHtml(value, {
        allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote'],
        allowedAttributes: { ol: ['start'] },
    });
}

export function prepareListingHtml(value: string): string {
    if (/<\/?[a-z][^>]*>/i.test(value)) return sanitizeListingHtml(value);
    return `<p>${escapeListingText(value).replace(/\r?\n/g, '<br>')}</p>`;
}

export function hasListingText(value: string): boolean {
    return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} })
        .replace(/&nbsp;|\u00a0/g, ' ').trim().length > 0;
}
