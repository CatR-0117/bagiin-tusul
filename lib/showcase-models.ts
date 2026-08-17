export type ShowcaseModel = {
  slug: string;
  number: string;
  name: string;
  englishName: string;
  category: string;
  description: string;
  src: string;
  iosSrc: string;
  fileSize: string;
  surface: string;
  accent: string;
};

export const showcaseModels: ShowcaseModel[] = [
  {
    slug: "sofa",
    number: "01",
    name: "Зөөлөн буйдан",
    englishName: "Sofa 03",
    category: "Интерьер",
    description:
      "Орчин үеийн хэлбэр, зөөлөн материалын деталийг бүх өнцгөөс нь эргүүлж үзээрэй.",
    src: "/models/sofa.glb",
    iosSrc: "/models/sofa.usdz?v=hq-1024",
    fileSize: "208 KB",
    surface: "#d9d3c8",
    accent: "#e45d36",
  },
  {
    slug: "wooden-bowl-spoon",
    number: "02",
    name: "Модон аяга, халбага",
    englishName: "Wooden bowl & spoon",
    category: "Гэр ахуй",
    description:
      "Модны ширхэг, гар хийцийн гадаргууг ойртуулж харах бодит мэт 3D загвар.",
    src: "/models/wooden-bowl-spoon.glb",
    iosSrc: "/models/wooden-bowl-spoon.usdz?v=hq-1024",
    fileSize: "182 KB",
    surface: "#d9b881",
    accent: "#30251b",
  },
  {
    slug: "travel-bag",
    number: "03",
    name: "Аяны цүнх",
    englishName: "Travel bag",
    category: "Аялал",
    description:
      "Цүнхний хэлбэр, оёдол болон материалын деталийг хулгана эсвэл хуруугаараа шалгана.",
    src: "/models/travel-bag.glb",
    iosSrc: "/models/travel-bag.usdz?v=hq-1024",
    fileSize: "789 KB",
    surface: "#bfc4b9",
    accent: "#204a3a",
  },
  {
    slug: "dartboard",
    number: "04",
    name: "Даартсын бай",
    englishName: "Dartboard",
    category: "Тоглоом",
    description:
      "Өнгө, тоо, металл хүрээний бүтцийг 360° эргэлтээр дэлгэрэнгүй үзэх загвар.",
    src: "/models/dartboard.glb",
    iosSrc: "/models/dartboard.usdz?v=hq-1024",
    fileSize: "302 KB",
    surface: "#c9bfb1",
    accent: "#c5322f",
  },
  {
    slug: "tissue-box",
    number: "05",
    name: "Салфетканы хайрцаг",
    englishName: "Paper tissue box",
    category: "Гэр ахуй",
    description:
      "Энгийн бүтээгдэхүүний танилцуулгыг интерактив 3D хэлбэрээр хэрхэн үзүүлэх жишээ.",
    src: "/models/tissue-box.glb",
    iosSrc: "/models/tissue-box.usdz?v=hq-1024",
    fileSize: "291 KB",
    surface: "#d5c9c5",
    accent: "#6e2c4c",
  },
];

export function getShowcaseModel(slug: string) {
  return showcaseModels.find((model) => model.slug === slug);
}
