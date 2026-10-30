import type { Copy } from "./types";

// Draft translation — needs review by a native Thai speaker before publishing.
export const th: Copy = {
  code: "th",
  lang: "th",
  name: "Thai",
  concept: "แนวคิด",
  rail: { search: "ค้นหา", cheaper: "ถูกกว่า", mustbuy: "ต้องซื้อ", locals: "คนท้องถิ่น" },
  hook: {
    headline: [
      { text: "ซื้ออะไร" },
      { text: "กลับบ้าน" },
      { text: "ถึงจะ" },
      { text: "คุ้ม", em: true },
      { text: "จริงๆ?" },
    ],
  },
  lost: {
    headline: "ส่วนใหญ่เป็นภาษาจีน",
    wrong: "ชิ้นที่ 2 พับ 6?",
    right: "= ชิ้นที่ 2 ลด 40%",
    footnote: "(6折 หมายถึงจ่ายแค่ 60%)",
  },
  price: { headline: "ถูกกว่าที่ไทยไหม?", sub: "บอกยากจริงๆ" },
  turn: { lead: "เราจึงกำลังสร้าง" },
  search: { kicker: "01 — ค้นหา", headline: "ด้วยภาษาของคุณ", result: "มาส์กหน้าแผ่น", firstQuery: "TH" },
  cheaper: {
    kicker: "02 — ถูกกว่าในไต้หวัน",
    headline: "ดูว่าอะไรถูกกว่าที่นี่",
    here: "ในไต้หวัน",
    home: "ที่ไทย",
    herePrice: "NT$199 ≈ ฿220",
    homePrice: "฿355",
    ratio: [220, 355],
    less: "ถูกกว่า ≈ 38%",
    footnote: "ราคาตัวอย่างเท่านั้น",
  },
  mustbuy: {
    kicker: "03 — ของต้องซื้อ",
    headline: "คุ้มค่าที่ในกระเป๋าเดินทาง",
    items: ["พายสับปะรด", "ชาอูหลงภูเขาสูง", "แครกเกอร์นูกัต", "มาส์กหน้าแผ่น"],
  },
  locals: {
    kicker: "04 — จากคนท้องถิ่น",
    headline: "ของที่คนที่นี่เลือกเอง",
    tag: "คนท้องถิ่นแนะนำ",
    footnote: "จะมีเพิ่มเมื่อเราเติบโตขึ้น",
  },
  end: { headline: "เพิ่งเริ่มต้น สร้างแบบเปิดเผยทุกขั้นตอน", comingSoon: "เร็วๆ นี้" },
  vo: {
    hook: "บ่ายว่างหนึ่งวัน กับกระเป๋าเดินทางที่ยังว่างอีกครึ่ง",
    lost: "แต่ป้ายทุกอันเป็นภาษาจีน แม้แต่ส่วนลดก็ยังต้องมาถอดรหัส",
    price: "NT$199 นี่คุ้มไหม หรือก็ราคาเท่ากับที่ไทยนั่นแหละ?",
    turn: "เราจึงกำลังสร้าง TaiwanHaul",
    search: "ค้นหาอะไรก็ได้ ด้วยภาษาของคุณเอง",
    cheaper: "ดูว่าอะไรถูกกว่าในไต้หวันจริงๆ",
    mustbuy: "เจอของต้องซื้อ ที่คุ้มกับที่ในกระเป๋า",
    locals: "และรู้ว่าคนไต้หวันซื้ออะไรกันจริงๆ",
    end: "TaiwanHaul เพิ่งเริ่มต้น ติดตามได้ที่ taiwanhaul.com",
  },
};
