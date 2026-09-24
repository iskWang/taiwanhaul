// Hand-built RFC 5322 message (no mime-building dependency, matching the repo's
// zero-npm-dependency philosophy). CRLF line endings throughout, base64 body
// (wrapped at 76 chars) and an RFC 2047 encoded-word Subject so non-ASCII names
// and messages (e.g. Thai, Chinese, Vietnamese) round-trip correctly.

/** Reject header values that could smuggle extra headers via CR/LF. */
export function assertSafeHeaderValue(value, label) {
  if (/[\r\n]/.test(value)) throw new Error(`unsafe header value for ${label}`);
  return value;
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function wrapBase64(b64, width = 76) {
  const lines = [];
  for (let i = 0; i < b64.length; i += width) lines.push(b64.slice(i, i + width));
  return lines.join('\r\n');
}

/** RFC 2047 "B" (base64) encoded-word, chunked so no encoded-word exceeds 75 chars. */
export function encodeHeaderText(text) {
  assertSafeHeaderValue(text, 'subject');
  // 45 raw chars -> <=60 base64 chars, comfortably under the 75-char encoded-word limit.
  const CHUNK = 45;
  const words = [];
  for (let i = 0; i < text.length; i += CHUNK) {
    words.push(`=?UTF-8?B?${utf8ToBase64(text.slice(i, i + CHUNK))}?=`);
  }
  return words.length ? words.join(' ') : '=?UTF-8?B?' + utf8ToBase64('') + '?=';
}

/**
 * @param {Object} options
 * @param {string} options.from
 * @param {string} options.to
 * @param {string} options.replyTo
 * @param {string} options.subject   Raw (unencoded) subject text.
 * @param {string} options.date      RFC 5322 date string.
 * @param {string} options.messageId Full "<...>" Message-ID value.
 * @param {string} options.body      Raw (unencoded) plain-text body.
 * @returns {string} the raw RFC 5322 message, CRLF-terminated headers + base64 body.
 */
export function buildRawEmail({ from, to, replyTo, subject, date, messageId, body }) {
  assertSafeHeaderValue(from, 'from');
  assertSafeHeaderValue(to, 'to');
  assertSafeHeaderValue(replyTo, 'replyTo');
  assertSafeHeaderValue(date, 'date');
  assertSafeHeaderValue(messageId, 'messageId');

  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Reply-To: ${replyTo}`,
    `Subject: ${encodeHeaderText(subject)}`,
    `Date: ${date}`,
    `Message-ID: ${messageId}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
  ];

  return headers.join('\r\n') + '\r\n\r\n' + wrapBase64(utf8ToBase64(body)) + '\r\n';
}

export function buildMessageId() {
  return `<${crypto.randomUUID()}@taiwanhaul.com>`;
}
