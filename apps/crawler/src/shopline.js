const decode = (value) => value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_, entity) => {
  if (entity[0] === '#') return String.fromCodePoint(entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1)));
  return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' })[entity.toLowerCase()];
});

const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([\w-]+)\s*=\s*(["'])(.*?)\2/gs)].map((m) => [m[1].toLowerCase(), decode(m[3])]));
const text = (html) => decode(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const amount = (html) => {
  const match = text(html).match(/NT\s*\$\s*([\d,]+)/i);
  if (!match) return null;
  const value = Number(match[1].replaceAll(',', ''));
  return Number.isSafeInteger(value) && value > 0 ? value : null;
};
const classHas = (tag, name) => (attrs(tag).class ?? '').split(/\s+/).includes(name);

export function parseShoplineList(html, pageUrl) {
  const items = [];
  const seen = new Set();
  for (const match of html.matchAll(/<product-item\b[^>]*\bproduct-id\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/product-item\s*>/gi)) {
    const start = html.lastIndexOf('<div', match.index);
    if (start < 0 || !classHas(html.slice(start, html.indexOf('>', start) + 1), 'product-item')) continue;
    const id = decode(match[2]);
    if (seen.has(id)) continue;
    seen.add(id);
    const body = match[3];
    let name = '';
    let productData = null;
    for (const a of body.matchAll(/<a\b[^>]*>/gi)) {
      const data = attrs(a[0])['ga-product'];
      if (data) {
        try {
          productData = JSON.parse(data);
          name = productData.title ?? '';
        } catch {}
        if (name) break;
      }
    }
    if (!name) name = text(body.match(/<[^>]*class\s*=\s*(["'])[^"']*\btitle\b[^"']*\1[^>]*>([\s\S]*?)<\//i)?.[2] ?? '');
    const href = decode(body.match(/<a\b[^>]*href\s*=\s*(["'])(.*?)\1/i)?.[2] ?? '');
    const priceTags = [...body.matchAll(/<([\w-]+)\b[^>]*class\s*=\s*(["'])(.*?)\2[^>]*>/gis)];
    const findPrice = (hasClass, excludeClass) => {
      const tag = priceTags.find((m) => m[3].split(/\s+/).includes(hasClass) && !m[3].split(/\s+/).includes(excludeClass));
      if (!tag) return null;
      const close = body.indexOf(`</${tag[1]}`, tag.index + tag[0].length);
      return close < 0 ? null : body.slice(tag.index + tag[0].length, close);
    };
    const sale = findPrice('price-sale');
    const regular = findPrice('price', 'price-crossed');
    items.push({
      id,
      name: text(name),
      url: new URL(href, pageUrl).href,
      amount: amount(sale ?? regular ?? ''),
      hasVariants: (() => {
        try { return JSON.parse(productData?.variations ?? '[]').length > 0; } catch { return false; }
      })(),
    });
  }

  let nextPageUrl = null;
  const pager = html.match(/<(?:ul|div)\b[^>]*class\s*=\s*(["'])[^"']*pagination[^"']*\1[^>]*>([\s\S]*?)<\/(?:ul|div)\s*>/i)?.[2];
  if (pager) {
    const links = [...pager.matchAll(/<a\b[^>]*href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a\s*>/gi)];
    const current = Number(pager.match(/<li\b[^>]*class\s*=\s*(["'])[^"']*\bactive\b[^"']*\1[^>]*>[\s\S]*?<a\b[^>]*>(\d+)/i)?.[2]);
    const next = links.find((link) => Number(text(link[3])) > current);
    if (next) nextPageUrl = new URL(decode(next[2]), pageUrl).href;
  }
  return { items, nextPageUrl };
}
