import type { Copy } from "./types";

// Draft translation — needs review by a native Indonesian speaker before publishing.
export const id: Copy = {
  code: "id",
  lang: "id",
  name: "Indonesian",
  concept: "KONSEP",
  rail: { search: "Cari", cheaper: "Lebih murah", mustbuy: "Wajib beli", locals: "Lokal" },
  hook: {
    headline: [
      { text: "Apa " },
      { text: "yang " },
      { text: "benar-benar", em: true },
      { text: " layak " },
      { text: "dibawa " },
      { text: "pulang?" },
    ],
  },
  lost: {
    headline: "Sebagian besar berbahasa Mandarin.",
    wrong: "Barang ke-2, lipat 6?",
    right: "= Diskon 40% untuk barang ke-2",
    footnote: "(6折 artinya kamu bayar 60%.)",
  },
  price: { headline: "Lebih murah dibanding di Indonesia?", sub: "Tidak mudah untuk tahu." },
  turn: { lead: "Karena itu kami membangun" },
  search: { kicker: "01 — Cari", headline: "Dalam bahasamu.", result: "Masker wajah", firstQuery: "MS/ID" },
  cheaper: {
    kicker: "02 — Lebih murah di Taiwan",
    headline: "Lihat mana yang lebih murah di sini.",
    here: "Di Taiwan",
    home: "Di Indonesia",
    herePrice: "NT$199 ≈ Rp100.000",
    homePrice: "Rp161.000",
    ratio: [100, 161],
    less: "≈ 38% lebih murah",
    footnote: "Harga hanya ilustrasi",
  },
  mustbuy: {
    kicker: "03 — Wajib beli",
    headline: "Layak dapat tempat di koper.",
    items: ["Kue nanas", "Oolong pegunungan", "Biskuit nougat", "Masker wajah"],
  },
  locals: {
    kicker: "04 — Dari warga lokal",
    headline: "Pilihan orang yang tinggal di sini.",
    tag: "pilihan lokal",
    footnote: "Hadir seiring kami berkembang.",
  },
  end: { headline: "Baru dimulai. Dibangun secara terbuka.", comingSoon: "Segera hadir" },
  vo: {
    hook: "Satu sore yang kosong. Koper masih setengah kosong.",
    lost: "Tapi semua label berbahasa Mandarin — bahkan diskonnya pun perlu dipecahkan.",
    price: "NT$199 itu murah? Atau sama saja dengan harga di Indonesia?",
    turn: "Karena itu kami membangun TaiwanHaul.",
    search: "Cari apa saja dalam bahasamu sendiri.",
    cheaper: "Lihat apa yang benar-benar lebih murah di Taiwan.",
    mustbuy: "Temukan barang wajib beli yang layak dapat tempat di koper.",
    locals: "Dan cari tahu apa yang benar-benar dibeli orang Taiwan.",
    end: "TaiwanHaul. Masih awal — ikuti perjalanannya di taiwanhaul.com.",
  },
};
