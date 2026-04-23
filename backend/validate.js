export function isSixDigits(value) {
  return typeof value === "string" && /^[0-9]{6}$/.test(value);
}

export function requireNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

