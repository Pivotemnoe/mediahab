export const brand = {
  productName: process.env.NEXT_PUBLIC_PRODUCT_NAME ?? "Наговори",
  fullName: process.env.NEXT_PUBLIC_PRODUCT_FULL_NAME ?? "Наговори",
  tagline: process.env.NEXT_PUBLIC_PRODUCT_TAGLINE ?? "Твои мысли. Твой стиль. Твои публикации.",
  logoMark: process.env.NEXT_PUBLIC_BRAND_LOGO_MARK ?? "Н",
  logoUrl: process.env.NEXT_PUBLIC_BRAND_LOGO_URL ?? "/brand/nagovori-mark.svg",
};

export const metadataBrand = {
  title: brand.productName,
  description: "Твои мысли, твой стиль и готовые публикации для каждой площадки.",
};
