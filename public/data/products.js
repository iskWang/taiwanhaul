// MOCK product catalog. All prices are illustrative sample values, not live data.
// Each product exists exactly once; sections.js references products by id.
//
// Shape (keep it when this becomes an API response):
//   id           stable slug
//   category     key into the `category.*` locale messages
//   emoji        placeholder visual until real imagery exists
//   name, blurb, unit, where   localized text ({ en, 'zh-TW' })
//   twPrice      { amount, currency: 'TWD' } typical Taiwan retail price
//   marketPrices { [marketCode]: { amount, currency } } typical price back home
//   search.zh       the Chinese term a Taiwanese shopper would type
//   search.aliases  what visitors might type instead (any language)

/** @type {import('../js/search/types.js').Product[]} */
export const PRODUCTS = [
  {
    id: 'prescription-glasses',
    category: 'eyewear',
    emoji: '👓',
    name: { en: 'Prescription glasses (frame + lenses)', 'zh-TW': '配眼鏡（鏡框＋鏡片）' },
    blurb: {
      en: 'Optical shops can fit a full pair within an hour, often for far less than back home.',
      'zh-TW': '眼鏡行常常一小時內就能配好，價格往往比國外便宜許多。',
    },
    unit: { en: 'per pair', 'zh-TW': '每副' },
    where: { en: 'Optical chains and neighbourhood optical shops', 'zh-TW': '連鎖眼鏡行、社區眼鏡行' },
    twPrice: { amount: 2500, currency: 'TWD' },
    marketPrices: {
      SG: { amount: 250, currency: 'SGD' },
      MY: { amount: 600, currency: 'MYR' },
      TH: { amount: 4500, currency: 'THB' },
      VN: { amount: 3000000, currency: 'VND' },
      PH: { amount: 6000, currency: 'PHP' },
    },
    search: { zh: '眼鏡', aliases: ['glasses', 'eyeglasses', 'spectacles', 'kacamata', 'cermin mata', 'kính mắt', 'แว่นตา', 'salamin'] },
  },
  {
    id: 'sheet-masks',
    category: 'beauty',
    emoji: '🧖',
    name: { en: 'Sheet masks (box of 10)', 'zh-TW': '面膜（10 片裝）' },
    blurb: {
      en: 'Taiwanese drugstore masks are a staple gift — light, cheap and easy to pack.',
      'zh-TW': '藥妝店面膜是送禮常備品，輕巧、便宜又好帶。',
    },
    unit: { en: 'box of 10', 'zh-TW': '10 片' },
    where: { en: 'Drugstores and cosmetics chains', 'zh-TW': '藥妝店、美妝連鎖' },
    twPrice: { amount: 199, currency: 'TWD' },
    marketPrices: {
      SG: { amount: 19.9, currency: 'SGD' },
      MY: { amount: 45, currency: 'MYR' },
      TH: { amount: 350, currency: 'THB' },
      VN: { amount: 250000, currency: 'VND' },
      PH: { amount: 499, currency: 'PHP' },
    },
    search: { zh: '面膜', aliases: ['sheet mask', 'face mask', 'masker wajah', 'mặt nạ', 'มาส์กหน้า'] },
  },
  {
    id: 'electric-cooker',
    category: 'home',
    emoji: '🍚',
    name: { en: 'Classic electric cooker (6-cup)', 'zh-TW': '經典電鍋（6 人份）' },
    blurb: {
      en: 'The steam cooker found in almost every Taiwanese kitchen. Check the voltage for your country.',
      'zh-TW': '幾乎每個台灣家庭都有的電鍋。購買前請確認電壓是否適用。',
    },
    unit: { en: 'per unit', 'zh-TW': '每台' },
    where: { en: 'Appliance stores and hypermarkets', 'zh-TW': '家電行、大賣場' },
    twPrice: { amount: 3290, currency: 'TWD' },
    marketPrices: {
      SG: { amount: 219, currency: 'SGD' },
      MY: { amount: 699, currency: 'MYR' },
      TH: { amount: 5990, currency: 'THB' },
      VN: { amount: 4990000, currency: 'VND' },
      PH: { amount: 8990, currency: 'PHP' },
    },
    search: { zh: '電鍋', aliases: ['electric cooker', 'rice cooker', 'steam cooker', 'periuk nasi', 'nồi cơm điện', 'หม้อหุงข้าว'] },
  },
  {
    id: 'oolong-tea',
    category: 'tea',
    emoji: '🍵',
    name: { en: 'High-mountain oolong tea (150 g)', 'zh-TW': '高山烏龍茶（150 克）' },
    blurb: {
      en: 'Fragrant, lightly oxidised oolong from Taiwan’s central mountains.',
      'zh-TW': '來自中央山脈的高山茶，清香回甘。',
    },
    unit: { en: '150 g', 'zh-TW': '150 克' },
    where: { en: 'Tea shops and farmers’ associations', 'zh-TW': '茶行、農會' },
    twPrice: { amount: 800, currency: 'TWD' },
    marketPrices: {
      SG: { amount: 58, currency: 'SGD' },
      MY: { amount: 168, currency: 'MYR' },
      TH: { amount: 1290, currency: 'THB' },
      PH: { amount: 2200, currency: 'PHP' },
    },
    search: { zh: '烏龍茶', aliases: ['oolong', 'oolong tea', 'teh oolong', 'trà ô long', 'ชาอู่หลง'] },
  },
  {
    id: 'instant-beef-noodles',
    category: 'food',
    emoji: '🍜',
    name: { en: 'Instant braised beef noodles (5-pack)', 'zh-TW': '紅燒牛肉泡麵（5 包）' },
    blurb: {
      en: 'Supermarket favourites with real sauce packets — a cult suitcase item.',
      'zh-TW': '附醬包的超市人氣泡麵，行李箱常客。',
    },
    unit: { en: '5-pack', 'zh-TW': '5 包' },
    where: { en: 'Supermarkets and convenience stores', 'zh-TW': '超市、便利商店' },
    twPrice: { amount: 189, currency: 'TWD' },
    marketPrices: {
      SG: { amount: 12.9, currency: 'SGD' },
      MY: { amount: 29.9, currency: 'MYR' },
      TH: { amount: 229, currency: 'THB' },
      VN: { amount: 185000, currency: 'VND' },
      PH: { amount: 420, currency: 'PHP' },
    },
    search: { zh: '泡麵', aliases: ['instant noodles', 'beef noodles', 'mi instan', 'mì gói', 'บะหมี่กึ่งสำเร็จรูป'] },
  },
  {
    id: 'pineapple-cake',
    category: 'food',
    emoji: '🍍',
    name: { en: 'Pineapple cakes (box of 10)', 'zh-TW': '鳳梨酥（10 入）' },
    blurb: {
      en: 'Buttery pastry with pineapple filling — Taiwan’s best-known edible souvenir.',
      'zh-TW': '奶油酥皮包鳳梨內餡，台灣最具代表性的伴手禮。',
    },
    unit: { en: 'box of 10', 'zh-TW': '10 入' },
    where: { en: 'Bakeries and souvenir shops', 'zh-TW': '糕餅店、伴手禮店' },
    twPrice: { amount: 450, currency: 'TWD' },
    search: { zh: '鳳梨酥', aliases: ['pineapple cake', 'pineapple tart', 'pineapple pastry', 'kue nanas', 'kuih nanas', 'bánh dứa', 'พายสับปะรด'] },
  },
  {
    id: 'nougat-crackers',
    category: 'food',
    emoji: '🍘',
    name: { en: 'Scallion nougat crackers', 'zh-TW': '香蔥牛軋餅' },
    blurb: {
      en: 'Salty scallion crackers sandwiching soft milk nougat. Sweet, salty, addictive.',
      'zh-TW': '蔥香鹹餅夾著牛奶牛軋糖，甜鹹交織。',
    },
    unit: { en: 'box of 20', 'zh-TW': '20 入' },
    where: { en: 'Bakeries and souvenir shops', 'zh-TW': '糕餅店、伴手禮店' },
    twPrice: { amount: 300, currency: 'TWD' },
    search: { zh: '牛軋餅', aliases: ['nougat cracker', 'nougat', 'biskut nougat', 'bánh nougat', 'นูกัต'] },
  },
  {
    id: 'sun-cake',
    category: 'food',
    emoji: '☀️',
    name: { en: 'Taichung sun cakes', 'zh-TW': '台中太陽餅' },
    blurb: {
      en: 'Flaky layered pastry with a maltose filling, a Taichung classic.',
      'zh-TW': '層層酥皮包麥芽糖餡的台中名產。',
    },
    unit: { en: 'box of 10', 'zh-TW': '10 入' },
    where: { en: 'Taichung bakeries, train stations', 'zh-TW': '台中糕餅店、車站' },
    twPrice: { amount: 250, currency: 'TWD' },
    search: { zh: '太陽餅', aliases: ['sun cake', 'suncake', 'bánh mặt trời', 'ขนมดวงอาทิตย์'] },
  },
  {
    id: 'mullet-roe',
    category: 'food',
    emoji: '🐟',
    name: { en: 'Dried mullet roe (karasumi)', 'zh-TW': '烏魚子' },
    blurb: {
      en: 'A prized New Year delicacy, sliced thin and lightly seared.',
      'zh-TW': '過年送禮的高級年菜，切薄片微炙最對味。',
    },
    unit: { en: 'per piece (~150 g)', 'zh-TW': '每片（約 150 克）' },
    where: { en: 'Dried-goods shops, Dihua Street', 'zh-TW': '南北貨行、迪化街' },
    twPrice: { amount: 1200, currency: 'TWD' },
    search: { zh: '烏魚子', aliases: ['mullet roe', 'karasumi', 'bottarga', 'trứng cá đối', 'ไข่ปลากระบอก'] },
  },
  {
    id: 'bubble-tea-kit',
    category: 'food',
    emoji: '🧋',
    name: { en: 'DIY bubble tea kit', 'zh-TW': '珍珠奶茶 DIY 組' },
    blurb: {
      en: 'Tapioca pearls, tea and brown sugar syrup to recreate the drink at home.',
      'zh-TW': '珍珠、茶包、黑糖漿一次備齊，在家也能做珍奶。',
    },
    unit: { en: 'kit for 4 drinks', 'zh-TW': '4 杯份' },
    where: { en: 'Souvenir shops, airport stores', 'zh-TW': '伴手禮店、機場商店' },
    twPrice: { amount: 380, currency: 'TWD' },
    search: { zh: '珍珠奶茶', aliases: ['bubble tea', 'boba', 'pearl milk tea', 'teh boba', 'trà sữa trân châu', 'ชานมไข่มุก'] },
  },
  {
    id: 'dried-mango',
    category: 'food',
    emoji: '🥭',
    name: { en: 'Irwin dried mango', 'zh-TW': '愛文芒果乾' },
    blurb: {
      en: 'Chewy, naturally sweet dried Irwin mango from southern Taiwan.',
      'zh-TW': '南台灣愛文芒果製成，Q 彈自然甜。',
    },
    unit: { en: '200 g', 'zh-TW': '200 克' },
    where: { en: 'Farmers’ associations, supermarkets', 'zh-TW': '農會、超市' },
    twPrice: { amount: 280, currency: 'TWD' },
    search: { zh: '芒果乾', aliases: ['dried mango', 'mango', 'mangga kering', 'xoài sấy', 'มะม่วงอบแห้ง'] },
  },
  {
    id: 'black-sesame-oil',
    category: 'food',
    emoji: '🫙',
    name: { en: 'Cold-pressed black sesame oil', 'zh-TW': '冷壓黑麻油' },
    blurb: {
      en: 'The base of sesame-oil chicken; small family presses still sell it by the bottle.',
      'zh-TW': '麻油雞的靈魂，老油行仍以瓶販售。',
    },
    unit: { en: '520 ml', 'zh-TW': '520 毫升' },
    where: { en: 'Traditional oil mills, markets', 'zh-TW': '老油行、傳統市場' },
    twPrice: { amount: 350, currency: 'TWD' },
    search: { zh: '黑麻油', aliases: ['sesame oil', 'black sesame oil', 'minyak bijan', 'dầu mè', 'น้ำมันงา'] },
  },
];
