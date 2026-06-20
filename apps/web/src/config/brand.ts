export const brand = {
  productName: process.env.NEXT_PUBLIC_PRODUCT_NAME ?? "MediaHub",
  fullName: process.env.NEXT_PUBLIC_PRODUCT_FULL_NAME ?? "Медиа-хаб",
  tagline: process.env.NEXT_PUBLIC_PRODUCT_TAGLINE ?? "Контент, диктовка, публикации.",
  logoMark: process.env.NEXT_PUBLIC_BRAND_LOGO_MARK ?? "MH",
  logoUrl: process.env.NEXT_PUBLIC_BRAND_LOGO_URL,
};

export const metadataBrand = {
  title: brand.productName,
  description: "Контент-студия для проектов, рубрик, ИИ-редактуры и мультиплатформенных публикаций.",
};
