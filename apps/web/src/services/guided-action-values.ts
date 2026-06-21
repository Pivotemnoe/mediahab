export type GuidedActionValue =
  | { amount: number; currency: string }
  | { text: string }
  | boolean
  | number
  | string
  | string[];

function firstText(values: string[]): string {
  return values[0] ?? "";
}

function textValue(value: string): { text: string } {
  return { text: value };
}

function moneyValue(value: string): GuidedActionValue {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return textValue("");
  }

  const amountMatch = trimmedValue.match(/[-+]?\d+(?:[\s.,]\d{3})*(?:[,.]\d+)?|[-+]?\d+(?:[,.]\d+)?/);
  if (!amountMatch) {
    return textValue(value);
  }

  const normalizedAmount = amountMatch[0].replace(/\s/g, "").replace(",", ".");
  const amount = Number(normalizedAmount);
  if (!Number.isFinite(amount)) {
    return textValue(value);
  }

  return { amount, currency: "RUB" };
}

function booleanValue(value: string): boolean {
  const normalizedValue = value.trim().toLowerCase();
  return normalizedValue === "1" || normalizedValue === "true" || normalizedValue === "yes" || normalizedValue === "on";
}

function numberValue(value: string): GuidedActionValue {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return textValue("");
  }

  if (!/^[-+]?\d+(?:[,.]\d+)?$/.test(trimmedValue)) {
    return textValue(value);
  }

  const number = Number(trimmedValue.replace(",", "."));
  return Number.isFinite(number) ? number : textValue(value);
}

function multiSelectValue(values: string[]): string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

export function typedGuidedActionValue(values: string[], fieldType: string | null): GuidedActionValue {
  const value = firstText(values);
  if (fieldType === "boolean") {
    return booleanValue(value);
  }
  if (fieldType === "money") {
    return moneyValue(value);
  }
  if (fieldType === "number" || fieldType === "rating") {
    return numberValue(value);
  }
  if (fieldType === "select") {
    return value;
  }
  if (fieldType === "multi_select") {
    return multiSelectValue(values);
  }
  return textValue(value);
}
