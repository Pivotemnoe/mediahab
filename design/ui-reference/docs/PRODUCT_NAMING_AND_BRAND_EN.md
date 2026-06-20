# Product Naming and Brand

## Current recommendation

Use **Temichev PostHub** as the working full name and **PostHub** as the short UI name.

Positioning:

> An AI-powered project builder for structured content creation and multi-platform publishing.

Primary tagline:

> Create once. Publish everywhere.

Alternative hero line:

> From voice notes to a ready-to-publish post for every platform.

## Naming constraint

`PostHub` is descriptive but generic and already used by multiple unrelated products and services. Treat it as a working name, not as a confirmed registrable commercial trademark.

## Implementation requirement

Brand values must be centralized and configurable. Do not hard-code product naming across UI components.

Suggested configuration:

```ts
export const brand = {
  productName: "PostHub",
  fullName: "Temichev PostHub",
  tagline: "Create once. Publish everywhere.",
  logoMark: "PH"
};
```

Support environment overrides:

```text
NEXT_PUBLIC_PRODUCT_NAME
NEXT_PUBLIC_PRODUCT_FULL_NAME
NEXT_PUBLIC_PRODUCT_TAGLINE
NEXT_PUBLIC_BRAND_LOGO_URL
```
