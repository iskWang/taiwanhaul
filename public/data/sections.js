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
        by: { name: 'Mei-Ling', role: { en: 'Home cook', 'zh-TW': '家庭主廚', th: 'แม่ครัวประจำบ้าน', vi: 'Đầu bếp gia đình', ms: 'Tukang masak rumah', fil: 'Kusinera sa bahay' }, city: { en: 'Tainan', 'zh-TW': '台南', th: 'ไถหนาน', vi: 'Đài Nam', ms: 'Tainan', fil: 'Tainan' } },
        quote: {
          en: 'Skip the airport gift boxes — buy it from a dried-goods shop and ask them to vacuum-seal it.',
          'zh-TW': '別買機場禮盒，去南北貨行買，請老闆幫你真空包裝。',
          th: 'อย่าซื้อกล่องของขวัญที่สนามบิน ไปซื้อที่ร้านของแห้งแล้วขอให้เขาแพ็กสุญญากาศให้',
          vi: 'Đừng mua hộp quà ở sân bay — hãy mua ở tiệm đồ khô và nhờ họ hút chân không.',
          ms: 'Jangan beli kotak hadiah di lapangan terbang — beli di kedai barangan kering dan minta mereka bungkus vakum.',
          fil: 'Huwag nang bumili ng gift box sa airport — bumili sa tindahan ng tuyong paninda at magpa-vacuum seal.',
        },
      },
      {
        productId: 'black-sesame-oil',
        by: { name: 'Chih-Hao', role: { en: 'Night-market vendor', 'zh-TW': '夜市攤商', th: 'พ่อค้าตลาดกลางคืน', vi: 'Người bán hàng chợ đêm', ms: 'Peniaga pasar malam', fil: 'Tindero sa night market' }, city: { en: 'Taichung', 'zh-TW': '台中', th: 'ไถจง', vi: 'Đài Trung', ms: 'Taichung', fil: 'Taichung' } },
        quote: {
          en: 'Supermarket bottles are fine, but a small oil mill’s cold-pressed batch smells completely different.',
          'zh-TW': '超市的也可以，但老油行冷壓的香氣完全不同。',
          th: 'ขวดจากซูเปอร์ก็ใช้ได้ แต่ของสกัดเย็นจากโรงหีบเล็กๆ กลิ่นหอมต่างกันลิบลับ',
          vi: 'Dầu ở siêu thị cũng được, nhưng mẻ ép lạnh của lò ép nhỏ thì thơm khác hẳn.',
          ms: 'Botol pasar raya pun boleh, tapi hasil perahan sejuk kilang kecil baunya lain sama sekali.',
          fil: 'Ayos lang ang nasa supermarket, pero iba talaga ang bango ng cold-pressed mula sa maliit na oil mill.',
        },
      },
      {
        productId: 'nougat-crackers',
        by: { name: 'Yu-Ting', role: { en: 'Office worker', 'zh-TW': '上班族', th: 'พนักงานออฟฟิศ', vi: 'Nhân viên văn phòng', ms: 'Pekerja pejabat', fil: 'Empleyado sa opisina' }, city: { en: 'Taipei', 'zh-TW': '台北', th: 'ไทเป', vi: 'Đài Bắc', ms: 'Taipei', fil: 'Taipei' } },
        quote: {
          en: 'This is what we actually bring to the office after a trip. Buy them fresh, they only last a few weeks.',
          'zh-TW': '這才是我們出遊回來真的會帶去公司的。買新鮮的，賞味期只有幾週。',
          th: 'นี่แหละของที่เราเอาไปฝากที่ออฟฟิศจริงๆ หลังกลับจากเที่ยว ซื้อแบบสดใหม่นะ เก็บได้แค่ไม่กี่สัปดาห์',
          vi: 'Đây mới là thứ chúng tôi thật sự mang lên công ty sau chuyến đi. Mua loại mới làm nhé, chỉ để được vài tuần.',
          ms: 'Inilah yang kami betul-betul bawa ke pejabat selepas bercuti. Beli yang segar, ia hanya tahan beberapa minggu.',
          fil: 'Ito talaga ang dinadala namin sa opisina pagkatapos ng biyahe. Bumili ng bago, ilang linggo lang itong tatagal.',
        },
      },
      {
        productId: 'dried-mango',
        by: { name: 'A-Hsiang', role: { en: 'Fruit farmer', 'zh-TW': '果農', th: 'ชาวสวนผลไม้', vi: 'Nông dân trồng trái cây', ms: 'Pekebun buah-buahan', fil: 'Magsasaka ng prutas' }, city: { en: 'Pingtung', 'zh-TW': '屏東', th: 'ผิงตง', vi: 'Bình Đông', ms: 'Pingtung', fil: 'Pingtung' } },
        quote: {
          en: 'Look for “no added sugar” on the label — good Irwin mango doesn’t need it.',
          'zh-TW': '挑標示「無加糖」的，好的愛文本來就夠甜。',
          th: 'มองหาคำว่า “ไม่เติมน้ำตาล” บนฉลาก มะม่วงเออร์วินดีๆ ไม่ต้องเติมก็หวานพอแล้ว',
          vi: 'Hãy tìm chữ “không thêm đường” trên nhãn — xoài Irwin ngon thì không cần.',
          ms: 'Cari label “tanpa gula tambahan” — mangga Irwin yang bagus tak memerlukannya.',
          fil: 'Hanapin ang “walang dagdag na asukal” sa label — hindi na kailangan iyon ng magandang Irwin mango.',
        },
      },
    ],
  },
};
