---
status: accepted
---

# Daily Price collection from brand-run shops, approved by a person

TaiwanHaul collects Products and Prices once a day from brands' own official online shops with a bot named `TaiwanhaulDotComBot`, and a person approves every new Offer and every Price change before it changes what Visitors see. Platforms (Shopee, momo, PChome, Yahoo, Coupang) are no longer Merchants; they appear only as External Search Links. Decided by the operator on 2026-11-19. This supersedes the 2026-10-29 decision "Product data is hand-curated; automated collection from Platforms is prohibited by their terms" in `docs/architecture.md`. [ADR 0001](0001-search-reads-prebuilt-index.md) still holds: a Visitor's search never triggers collection.

Prices are the point of the site, but rule 21 of the Product Spec kept every Offer without a Price until a recurring re-check existed, and a person re-checking every Price daily does not scale.

## Considered Options

- **Collect from Platforms.** Rejected. momo's terms forbid accessing its systems with "機器人、模擬器或自動化工具"; Coupang's terms (§9.2) restrict data mining and robots without written consent ([evidence](../research/external-search-links.md)). A person approving the result does not change how the data was obtained.
- **A person re-checks Prices daily in a browser.** Rejected: the work grows with every Offer.
- **Official affiliate or data feeds.** Rejected for now: Yahoo's affiliate program closed in 2023 and Shopee Affiliate requires a Taiwan ID.
- **Run the collector on the operator's Mac mini or in GitHub Actions.** Rejected. A block would hit the operator's home IP; the repo is public and Actions would need the admin credentials.
- **Approve by replying to an email.** Rejected: a sender can be forged.

## Decision

### Which shops

A shop is collected only when all of these hold, checked by a person when the shop is added and recorded in the private admin manual (`docs/admin.private.md`):

1. It is the brand's own official online shop. A shop that ships only within Taiwan qualifies; the Offer shows its shipping scope.
2. Its terms contain no clause restricting automated access or the use, copying or quoting of site data. Common examples that disqualify a shop: 「任何人不得逕自使用、修改、重製…若您欲使用本公司任何資料必須要取得本公司授權同意」 (舊振南) and 「若您欲引用網站內容，必須依法取得本公司或其他權利人的事前書面同意」 (九福). Such shops are skipped, not asked for permission. A shop whose footer has no terms page counts as not restricting.
3. `robots.txt` does not disallow its list or product pages for our user agent. In a `Content-Signal` line only `search` applies to this use; `search=no` skips the shop, and other signals such as `ai-train` are ignored.

First shops (checked 2026-11-19, both on Shopline): 糖村 (`sugar.com.tw`) and 維格餅家 (`vigorkobo.com`).

### How the bot behaves

- A new Worker, `taiwanhaul-crawler`, runs on a daily Cron Trigger. Requests send the user agent `TaiwanhaulDotComBot/1.0 (+https://taiwanhaul.com/terms)`.
- At most 5 page loads per shop per day, plus one `robots.txt` fetch. A page load is one navigation to a shop URL; its redirects belong to it, and so do the scripts and data a Browser Run page load needs to render. Browser Run blocks images, fonts and media. Page loads are at least 5 seconds apart, or longer if `robots.txt` sets a longer `Crawl-delay`. The bot reads the shop's all-products list pages first and spends the remaining page loads on new Products or changed Prices; the rest wait for the next day. Sitemaps of the checked shops do not list product URLs, so discovery uses list pages.
- Shops that put Prices in the HTML are read with `fetch`. Shops that render with JavaScript use Cloudflare Browser Run with `crawlPurposes: ["search"]`. Free plan: 10 browser minutes per day.
- The bot stops collecting a shop and emails the operator when `robots.txt` disallows it, when the shop answers 403 or 429 on two consecutive days, or when it shows a challenge or CAPTCHA page.

### Approval

- At most one digest email per day, only when something changed, sent to the address in the existing `CONTACT_TO` secret.
- A person approves new Products after opening the shop's page in a browser once, and approves Price changes from the collected values.
- Each item in the email has one-time Approve and Reject links that expire after 7 days. They open a page served by `taiwanhaul-crawler` on its own hostname behind Cloudflare Access (passkey login). The approval page is not on `taiwanhaul-admin`, whose mTLS access is unchanged.
- A proposal is superseded as soon as the bot reads that Offer again with a different result (another amount, sold out, missing, or unreadable). Approving a superseded proposal does nothing and the page says so; only the newest proposal for an Offer can be approved. Approval never makes a hidden Offer visible unless the latest read found it for sale with a readable Price.

### What Visitors see

- Same Price read again: `checked_on` moves to that Asia/Taipei date without approval.
- Different Price read: the Offer keeps its previous Price and `checked_on` until a person approves; the 30-day freshness rule still hides it when it ages out.
- Page missing, sold out, or Price unreadable: the Offer is hidden at once and returns only after approval.
- Local Estimates use ExchangeRate-API open-access rates, fetched once a day, with the FX date. Its required attribution link (`Rates By Exchange Rate API`) is in the footer and on the Terms page.
- A Terms page and a footer disclaimer exist in every supported Locale. zh-TW disclaimer: 「商品與價格由程式自動從品牌官網收集，可能有誤或已過時，請以品牌官網為準。TaiwanHaul 與這些品牌沒有合作關係。」 The Terms page names the bot, its user agent, and how a site opts out with `robots.txt`.
- Homepage suggestions use terms that return results from the current Product Index.

## Consequences

- The four current Platform Offers in production D1 are deleted before the first brand Offers are approved; search returns no Products in between. External Search Links to Platforms stay, because a Visitor clicks them. Their linking permission is still only partly known: Shopee explicitly welcomes links, while for momo, PChome and Yahoo no linking clause was found either way (UNKNOWN, [research](../research/external-search-links.md)).
- New Cloudflare resources need operator approval before creation: the `taiwanhaul-crawler` Worker, its hostname, an Access application, email sending, and a Browser Run binding.
- `taiwanhaul-admin` stays, because it writes D1 through a binding and avoids an account-wide D1 API token (decided 2026-10-30, #14). Its `/seed` route is removed: it deletes and rewrites all six tables, which would erase approved Collector data. `/migrate` stays for schema changes, including deleting the four Platform Offers.
- Risks the operator accepted: this is not legal advice; a shop may change its terms or `robots.txt` at any time, so `robots.txt` is read on every run and terms are re-read when a shop is added. ExchangeRate-API terms say its data "may only be used for your end purposes and not in any product or service that offers programmatic or automatic access to exchange rate data"; the WebMCP search tool returns Local Estimates.
- `checked_on` now means the last day the bot read an approved amount, not the day a person verified it. The disclaimer states that Prices are machine-collected.
