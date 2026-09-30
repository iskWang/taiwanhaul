import type { Copy } from "./types";

// Draft translation — needs review by a native Malay speaker before publishing.
export const ms: Copy = {
  code: "ms",
  lang: "ms",
  name: "Malay",
  concept: "KONSEP",
  rail: { search: "Cari", cheaper: "Lebih murah", mustbuy: "Wajib beli", locals: "Tempatan" },
  hook: {
    headline: [
      { text: "Apa " },
      { text: "yang " },
      { text: "benar-benar", em: true },
      { text: " berbaloi " },
      { text: "dibawa " },
      { text: "pulang?" },
    ],
  },
  lost: {
    headline: "Kebanyakannya dalam bahasa Cina.",
    wrong: "Item ke-2, lipat 6?",
    right: "= Diskaun 40% untuk item ke-2",
    footnote: "(6折 bermaksud anda bayar 60%.)",
  },
  price: { headline: "Lebih murah daripada di Malaysia?", sub: "Sukar untuk dipastikan." },
  turn: { lead: "Jadi kami sedang membina" },
  search: { kicker: "01 — Cari", headline: "Dalam bahasa anda.", result: "Topeng muka", firstQuery: "MS/ID" },
  cheaper: {
    kicker: "02 — Lebih murah di Taiwan",
    headline: "Lihat apa yang lebih murah di sini.",
    here: "Di Taiwan",
    home: "Di Malaysia",
    herePrice: "NT$199 ≈ RM 28",
    homePrice: "RM 45",
    ratio: [28, 45],
    less: "≈ 38% lebih murah",
    footnote: "Harga sekadar contoh",
  },
  mustbuy: {
    kicker: "03 — Wajib beli",
    headline: "Berbaloi ruang dalam beg.",
    items: ["Kek nanas", "Oolong tanah tinggi", "Biskut nougat", "Topeng muka"],
  },
  locals: {
    kicker: "04 — Pilihan warga tempatan",
    headline: "Pilihan orang yang tinggal di sini.",
    tag: "pilihan tempatan",
    footnote: "Akan datang seiring kami berkembang.",
  },
  end: { headline: "Baru bermula. Dibina secara terbuka.", comingSoon: "Akan datang" },
  vo: {
    hook: "Satu petang yang lapang. Separuh beg masih kosong.",
    lost: "Tapi semua label dalam bahasa Cina — malah diskaun pun perlu ditafsir.",
    price: "NT$199 ni murah ke? Atau sama saja dengan harga di Malaysia?",
    turn: "Jadi kami sedang membina TaiwanHaul.",
    search: "Cari apa sahaja dalam bahasa anda sendiri.",
    cheaper: "Lihat apa yang benar-benar lebih murah di Taiwan.",
    mustbuy: "Temui barang wajib beli yang berbaloi ruang dalam beg.",
    locals: "Dan ketahui apa yang orang Taiwan betul-betul beli.",
    end: "TaiwanHaul. Baru bermula — ikuti kami di taiwanhaul.com.",
  },
};
