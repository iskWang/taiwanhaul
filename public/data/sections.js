// MOCK homepage curation. Sections reference products by id only; product
// details live once in products.js. A future CMS/API can return this shape.

export const SECTIONS = {
  /** Candidates for the price comparison; the UI shows the ones cheaper for the visitor's market. */
  cheaper: {
    productIds: ['prescription-glasses', 'electric-cooker', 'oolong-tea', 'sheet-masks', 'instant-beef-noodles'],
  },
  mustBuy: {
    productIds: ['pineapple-cake', 'nougat-crackers', 'sun-cake', 'bubble-tea-kit', 'dried-mango', 'oolong-tea'],
  },
  /** Sample editorial picks. People are illustrative personas, not real reviewers. */
  recommended: {
    items: [
      {
        productId: 'mullet-roe',
        by: { name: 'Mei-Ling', role: { en: 'Home cook', 'zh-TW': '家庭主廚' }, city: { en: 'Tainan', 'zh-TW': '台南' } },
        quote: {
          en: 'Skip the airport gift boxes — buy it from a dried-goods shop and ask them to vacuum-seal it.',
          'zh-TW': '別買機場禮盒，去南北貨行買，請老闆幫你真空包裝。',
        },
      },
      {
        productId: 'black-sesame-oil',
        by: { name: 'Chih-Hao', role: { en: 'Night-market vendor', 'zh-TW': '夜市攤商' }, city: { en: 'Taichung', 'zh-TW': '台中' } },
        quote: {
          en: 'Supermarket bottles are fine, but a small oil mill’s cold-pressed batch smells completely different.',
          'zh-TW': '超市的也可以，但老油行冷壓的香氣完全不同。',
        },
      },
      {
        productId: 'nougat-crackers',
        by: { name: 'Yu-Ting', role: { en: 'Office worker', 'zh-TW': '上班族' }, city: { en: 'Taipei', 'zh-TW': '台北' } },
        quote: {
          en: 'This is what we actually bring to the office after a trip. Buy them fresh, they only last a few weeks.',
          'zh-TW': '這才是我們出遊回來真的會帶去公司的。買新鮮的，賞味期只有幾週。',
        },
      },
      {
        productId: 'dried-mango',
        by: { name: 'A-Hsiang', role: { en: 'Fruit farmer', 'zh-TW': '果農' }, city: { en: 'Pingtung', 'zh-TW': '屏東' } },
        quote: {
          en: 'Look for “no added sugar” on the label — good Irwin mango doesn’t need it.',
          'zh-TW': '挑標示「無加糖」的，好的愛文本來就夠甜。',
        },
      },
    ],
  },
};
