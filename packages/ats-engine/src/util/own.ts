/**
 * A record's own value for `key`, or undefined.
 *
 * Every record the engine indexes by a word from the input — synonyms, language names, HTML
 * entities, a provider's finish reasons — is a plain object, so `record[word]` also reads
 * `Object.prototype`: a resume saying "constructor" got back the `Object` function.
 */
export function own<T>(record: Readonly<Record<string, T>>, key: string): T | undefined {
  return Object.hasOwn(record, key) ? record[key] : undefined;
}
