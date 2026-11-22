export type ShoplineListItem = {
  id: string;
  name: string;
  url: string;
  amount: number | null;
  hasVariants: boolean;
};

export type ShoplineListResult = {
  items: ShoplineListItem[];
  nextPageUrl: string | null;
};

export type ShoplineVariant = {
  id: string;
  label: string;
  amount: number | null;
  soldOut: boolean;
};

export type ShoplineProductResult = {
  id: string;
  name: string;
  preorder: boolean;
  variants: ShoplineVariant[];
};

type JsonRecord = Record<string, unknown>;
const isRecord = (value: unknown): value is JsonRecord => typeof value === 'object' && value !== null && !Array.isArray(value);

const decode = (value: string): string => value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_match: string, entity: string) => {
  if (entity[0] === '#') return String.fromCodePoint(entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1)));
  return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' } as Record<string, string>)[entity.toLowerCase()] ?? '';
});

const attrs = (tag: string): Record<string, string> => Object.fromEntries([...tag.matchAll(/([\w-]+)\s*=\s*(["'])(.*?)\2/gs)].map((m) => [m[1].toLowerCase(), decode(m[3])]));
const text = (html: string): string => decode(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const amount = (html: string): number | null => {
  const match = text(html).match(/NT\s*\$\s*([\d,]+)/i);
  if (!match) return null;
  const value = Number(match[1].replaceAll(',', ''));
  return Number.isSafeInteger(value) && value > 0 ? value : null;
};
const classHas = (tag: string, name: string): boolean => (attrs(tag).class ?? '').split(/\s+/).includes(name);


export function parseShoplineList(html: string, pageUrl: string): ShoplineListResult {
  const items: ShoplineListItem[] = [];
  const seen = new Set<string>();
  for (const match of html.matchAll(/<product-item\b[^>]*\bproduct-id\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/product-item\s*>/gi)) {
    const start = html.lastIndexOf('<div', match.index);
    if (start < 0 || !classHas(html.slice(start, html.indexOf('>', start) + 1), 'product-item')) continue;
    const id = decode(match[2]);
    if (seen.has(id)) continue;
    seen.add(id);
    const body = match[3];
    let name = '';
    let productData: JsonRecord | null = null;
    for (const a of body.matchAll(/<a\b[^>]*>/gi)) {
      const data = attrs(a[0])['ga-product'];
      if (data) {
        try {
          const parsed: unknown = JSON.parse(data);
          if (isRecord(parsed)) {
            productData = parsed;
            name = typeof parsed.title === 'string' ? parsed.title : '';
          }
        } catch {}
        if (name) break;
      }
    }
    if (!name) name = text(body.match(/<[^>]*class\s*=\s*(["'])[^"']*\btitle\b[^"']*\1[^>]*>([\s\S]*?)<\//i)?.[2] ?? '');
    const href = decode(body.match(/<a\b[^>]*href\s*=\s*(["'])(.*?)\1/i)?.[2] ?? '');
    const priceTags = [...body.matchAll(/<([\w-]+)\b[^>]*class\s*=\s*(["'])(.*?)\2[^>]*>/gis)];
    const findPrice = (hasClass: string, excludeClass?: string): string | null => {
      const tag = priceTags.find((m) => {
        const classes = m[3].split(/\s+/);
        return classes.includes(hasClass) && (excludeClass === undefined || !classes.includes(excludeClass));
      });
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
        try {
          const rawVariations = productData?.variations;
          const parsed: unknown = JSON.parse(typeof rawVariations === 'string' ? rawVariations : '[]');
          return Array.isArray(parsed) && parsed.length > 0;
        } catch { return false; }
      })(),
    });
  }

  let nextPageUrl: string | null = null;
  const pager = html.match(/<(?:ul|div)\b[^>]*class\s*=\s*(["'])[^"']*pagination[^"']*\1[^>]*>([\s\S]*?)<\/(?:ul|div)\s*>/i)?.[2];
  if (pager) {
    const links = [...pager.matchAll(/<a\b[^>]*href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a\s*>/gi)];
    const current = Number(pager.match(/<li\b[^>]*class\s*=\s*(["'])[^"']*\bactive\b[^"']*\1[^>]*>[\s\S]*?<a\b[^>]*>(\d+)/i)?.[2]);
    const next = links.find((link) => Number(text(link[3])) > current);
    if (next) nextPageUrl = new URL(decode(next[2]), pageUrl).href;
  }
  return { items, nextPageUrl };
}

const decodeJsString = (value: string): string => {
  let result = '';
  for (let i = 0; i < value.length; i++) {
    if (value[i] !== '\\') {
      result += value[i];
      continue;
    }
    const escape = value[++i];
    if (escape === undefined) throw new Error('Incomplete string escape');
    const simple: Record<string, string> = { '"': '"', "'": "'", '\\': '\\', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', v: '\v', '0': '\0' };
    if (escape in simple) result += simple[escape];
    else if (escape === '\n' || escape === '\u2028' || escape === '\u2029') continue;
    else if (escape === '\r') {
      if (value[i + 1] === '\n') i++;
    } else if (escape === 'x' || escape === 'u') {
      if (escape === 'u' && value[i + 1] === '{') {
        const end = value.indexOf('}', i + 2);
        const digits = value.slice(i + 2, end < 0 ? undefined : end);
        if (end < 0 || !/^[\da-fA-F]{1,6}$/.test(digits) || parseInt(digits, 16) > 0x10ffff) throw new Error('Invalid string escape');
        result += String.fromCodePoint(parseInt(digits, 16));
        i = end;
      } else {
        const length = escape === 'x' ? 2 : 4;
        const digits = value.slice(i + 1, i + 1 + length);
        if (!new RegExp(`^[\\da-fA-F]{${length}}$`).test(digits)) throw new Error('Invalid string escape');
        result += String.fromCharCode(parseInt(digits, 16));
        i += length;
      }
    } else result += escape;
  }
  return result;
};

export function parseShoplineProduct(html: string, pageUrl: string): ShoplineProductResult | null {
  try {
    const encoded = html.match(/app\.value\(\s*(['"])product\1\s*,\s*JSON\.parse\(\s*'((?:\\[\s\S]|[^'\\])*)'\s*\)\s*\)/);
    if (!encoded) return null;
    const parsed: unknown = JSON.parse(decodeJsString(encoded[2]));
    if (!isRecord(parsed)) return null;
    const p = parsed;

    const titles = p.title_translations ?? {};
    if (!isRecord(titles)) return null;
    const title = titles['zh-hant'] ?? Object.values(titles)[0] ?? '';
    if (typeof title !== 'string' || typeof p._id !== 'string') return null;
    const getAmount = (item: JsonRecord): number | null => {
      if (p.hide_price) return null;
      const sale = isRecord(item.price_sale) ? item.price_sale.cents : undefined;
      const regular = isRecord(item.price) ? item.price.cents : undefined;
      const candidate = typeof sale === 'number' && sale > 0 ? sale : typeof regular === 'number' && regular > 0 ? regular : null;
      return candidate !== null && Number.isSafeInteger(candidate) && candidate > 0 ? candidate : null;
    };
    const soldOut = (quantity: unknown): boolean => !!p.sold_out || (!p.unlimited_quantity && !p.out_of_stock_orderable && typeof quantity === 'number' && quantity <= 0);
    const variations: unknown[] = Array.isArray(p.variations) ? p.variations : [];
    const variants: ShoplineVariant[] = variations.map((value) => {
      if (!isRecord(value) || typeof value.key !== 'string') throw new Error('Invalid variation');
      const translations = value.fields_translations;
      const labels = isRecord(translations) ? translations['zh-hant'] ?? [] : [];
      if (!Array.isArray(labels) || !labels.every((label: unknown) => typeof label === 'string')) throw new Error('Invalid variant label');
      return { id: value.key, label: labels.join(' / '), amount: getAmount(value), soldOut: soldOut(value.quantity) };
    });
    return {
      id: p._id,
      name: title.trim(),
      preorder: !!p.is_preorder,
      variants: variants.length ? variants : [{ id: p._id, label: '', amount: getAmount(p), soldOut: soldOut(p.quantity) }],
    };
  } catch {
    return null;
  }
}

