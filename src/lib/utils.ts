export function hasUniqueValues<T>(arr: T[], key: keyof T): boolean {
  const seen = new Set();
  for (const item of arr) {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
  }
  return true;
}
