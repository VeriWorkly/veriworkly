/**
 * `compute`, run once per key object — the "compile once per policy" cache every module needs.
 *
 * A WeakMap keyed on the caller's own object is not hidden global state: it holds nothing once
 * the key is gone, two policies never see each other's entry, and passing the same object again
 * is the only way to a hit. The key must be the object the value is derived from, and not be
 * mutated afterwards; parsed policies never are.
 */
export function memo<K extends object, V>(compute: (key: K) => V): (key: K) => V {
  const cache = new WeakMap<K, V>();
  return (key) => {
    if (cache.has(key)) return cache.get(key) as V;
    const value = compute(key);
    cache.set(key, value);
    return value;
  };
}
