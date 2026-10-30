import type { Copy } from "./types";

// Draft translation — needs review by a native Vietnamese speaker before publishing.
export const vi: Copy = {
  code: "vi",
  lang: "vi",
  name: "Vietnamese",
  concept: "Ý TƯỞNG",
  rail: { search: "Tìm kiếm", cheaper: "Rẻ hơn", mustbuy: "Phải mua", locals: "Bản địa" },
  hook: {
    headline: [
      { text: "Thứ " },
      { text: "gì " },
      { text: "thật sự", em: true },
      { text: " đáng " },
      { text: "mang " },
      { text: "về nhà?" },
    ],
  },
  lost: {
    headline: "Hầu hết đều bằng tiếng Trung.",
    wrong: "Món thứ 2, gấp 6?",
    right: "= Giảm 40% món thứ 2",
    footnote: "(6折 nghĩa là bạn trả 60%.)",
  },
  price: { headline: "Có rẻ hơn ở Việt Nam không?", sub: "Thật khó mà biết." },
  turn: { lead: "Vì vậy chúng tôi đang xây dựng" },
  search: { kicker: "01 — Tìm kiếm", headline: "Bằng ngôn ngữ của bạn.", result: "Mặt nạ giấy", firstQuery: "VI" },
  cheaper: {
    kicker: "02 — Rẻ hơn ở Đài Loan",
    headline: "Xem món nào rẻ hơn ở đây.",
    here: "Ở Đài Loan",
    home: "Ở Việt Nam",
    herePrice: "NT$199 ≈ 160.000 ₫",
    homePrice: "258.000 ₫",
    ratio: [160, 258],
    less: "Rẻ hơn ≈ 38%",
    footnote: "Giá chỉ mang tính minh họa",
  },
  mustbuy: {
    kicker: "03 — Nhất định phải mua",
    headline: "Đáng một chỗ trong vali.",
    items: ["Bánh dứa", "Trà ô long núi cao", "Bánh quy nougat", "Mặt nạ giấy"],
  },
  locals: {
    kicker: "04 — Từ người bản địa",
    headline: "Lựa chọn từ người sống tại đây.",
    tag: "người bản địa chọn",
    footnote: "Sẽ có khi chúng tôi lớn dần.",
  },
  end: { headline: "Mới bắt đầu. Xây dựng công khai.", comingSoon: "Sắp ra mắt" },
  vo: {
    hook: "Một buổi chiều rảnh rỗi. Chiếc vali vẫn còn trống một nửa.",
    lost: "Nhưng nhãn nào cũng bằng tiếng Trung — đến cả khuyến mãi cũng phải giải mã.",
    price: "NT$199 có rẻ không? Hay cũng bằng giá ở Việt Nam?",
    turn: "Vì vậy chúng tôi đang xây dựng TaiwanHaul.",
    search: "Tìm bất cứ thứ gì bằng ngôn ngữ của bạn.",
    cheaper: "Xem món nào thật sự rẻ hơn ở Đài Loan.",
    mustbuy: "Tìm những món nhất định phải mua, đáng một chỗ trong vali.",
    locals: "Và biết người Đài Loan thật sự mua gì.",
    end: "TaiwanHaul. Mới bắt đầu thôi — theo dõi tại taiwanhaul.com.",
  },
};
