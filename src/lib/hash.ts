/**
 * Generates a deterministic hash string from an entry object using the DJB2 algorithm.
 * Serializes the entry to JSON and computes a base-36 encoded hash.
 *
 * @param entry - The key-value object to hash
 * @returns A base-36 encoded hash string
 */
export function hashEntry(entry: Record<string, unknown>): string {
    const str = JSON.stringify(entry);
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
    }
    return (hash >>> 0).toString(36);
}