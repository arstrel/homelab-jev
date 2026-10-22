export function briefText(value: string) {
  return value
    .replace(/\p{C}/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300)
    .replace(/&/g, "&amp;")
    .replace(/[\\`*_{}[\]()#+.!|<>~-]/g, "\\$&");
}
