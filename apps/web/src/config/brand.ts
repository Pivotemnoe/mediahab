export const brand = {
  productName: process.env.NEXT_PUBLIC_PRODUCT_NAME ?? "PostHub",
  fullName: process.env.NEXT_PUBLIC_PRODUCT_FULL_NAME ?? "Temichev PostHub",
  tagline: process.env.NEXT_PUBLIC_PRODUCT_TAGLINE ?? "Создавайте один раз. Публикуйте везде.",
  logoMark: process.env.NEXT_PUBLIC_BRAND_LOGO_MARK ?? "PH",
  logoUrl: process.env.NEXT_PUBLIC_BRAND_LOGO_URL,
};

export const metadataBrand = {
  title: brand.productName,
  description: "Контент-студия для проектов, рубрик, AI-редактуры и мультиплатформенных публикаций.",
};
