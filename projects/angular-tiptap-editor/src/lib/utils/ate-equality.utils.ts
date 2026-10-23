export function shallowArrayEqual<T>(a: readonly T[], b: readonly T[]): boolean {
  return a === b || (a.length === b.length && a.every((item, i) => item === b[i]));
}

export function shallowObjectEqual<T extends object>(a: T, b: T): boolean {
  if (a === b) {
    return true;
  }
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  return (
    aKeys.length === bKeys.length &&
    aKeys.every(
      key =>
        Object.prototype.hasOwnProperty.call(b, key) &&
        (a as Record<string, unknown>)[key] === (b as Record<string, unknown>)[key]
    )
  );
}
