# TaiwanHaul

A multilingual search and discovery site that helps Southeast Asian travelers find Taiwanese products in their own language and reach the Taiwanese shops that sell them. TaiwanHaul does not sell anything itself.

## Language

### Visitors

**Visitor**:
A person using the site, usually a traveler from a Target Market who does not read Chinese.
_Avoid_: User, customer, buyer

**Locale**:
The language the site is shown in (en, zh-TW, th, vi, ms, fil).
_Avoid_: Language setting, region

**Market**:
The Visitor's home country (SG, MY, TH, VN, PH), which decides the local currency shown. Independent of Locale.
_Avoid_: Country, region, locale

### Catalog

**Product**:
One specific item a Visitor can buy, identified by brand, name, model and Variant. Two Variants of the same line are two Products.
_Avoid_: Item, SKU, listing

**Variant**:
The size, capacity, flavor, model or pack count that separates otherwise similar Products.
_Avoid_: Option, spec

**Platform**:
A Taiwanese e-commerce site such as Shopee, momo or PChome.
_Avoid_: Source, store, marketplace, merchant

**Merchant**:
The shop that actually sells an Offer. For now only Merchants operated by the Platform itself are in scope; third-party sellers on a Platform are not, because their service quality cannot be verified.
_Avoid_: Seller, vendor, store, shop

**Offer**:
One Merchant's page selling one Product, with an Outbound Link, an optional Price and the date it was last checked.
_Avoid_: Listing, result, deal

**Product Index**:
TaiwanHaul's private, curated collection of Products and Offers. It is a data asset and is never published in full.
_Avoid_: Catalog, database, dataset

**Product Merge**:
Grouping several Offers under one Product. Only done when the Offers are reliably the same Product and Variant; when unsure, keep them separate.
_Avoid_: Dedupe, grouping, clustering

### Prices

**Price**:
The amount in TWD a Merchant asked for a Product on a given day. Shown only when it is a Fresh Price.
_Avoid_: Live price, current price

**Fresh Price**:
A Price checked on the same Asia/Taipei calendar day it is shown.
_Avoid_: Real-time price, latest price

**Local Estimate**:
A Price converted into the Visitor's Market currency. Always approximate and always shown next to the TWD Price.
_Avoid_: Local price, converted price

### Search

**Query**:
The text a Visitor types, in any Locale.
_Avoid_: Keyword, search string

**Chinese Search Term**:
The Chinese wording TaiwanHaul suggests for a Query, which the Visitor can copy or correct.
_Avoid_: Translation, keyword, normalized query

**Best Match**:
The default result order, ranked by how closely brand, name, model, Variant, cross-language aliases and category match the Query.
_Avoid_: Relevance sort, default sort

**External Search Link**:
A link that opens a Platform's own search page for a Chinese Search Term, shown whether or not TaiwanHaul has results. Only offered for Platforms TaiwanHaul can get structured Product data from.
_Avoid_: Fallback link, outbound search

**Outbound Link**:
A link from an Offer to the Merchant's own product page.
_Avoid_: Buy link, affiliate link, purchase link

**Unmet Demand**:
A recorded Query that returned no Products, used to decide what to add to the Product Index next.
_Avoid_: Failed search, missed search, zero-result log

### Content

**Discovery Content**:
Curated homepage picks that are not driven by a Query, such as Taiwan must-buys and locals' recommendations.
_Avoid_: Featured products, editorial, recommendations

**Delivery Inquiry**:
A message a Visitor sends through Contact asking for help getting a Product delivered. TaiwanHaul answers it by hand; there is no order flow.
_Avoid_: Order, purchase request, proxy purchase
