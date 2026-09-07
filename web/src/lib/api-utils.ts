/**
 * Recursively pull the first human-readable message out of a DRF-style
 * validation payload (e.g. `{name: ["..."], non_field_errors: [...]}`).
 * Returns the fallback string when nothing displayable could be found.
 */
export function extractFirstError(data: unknown, fallback: string): string {
  const found = extractNullable(data)
  return found ?? fallback
}

function extractNullable(data: unknown): string | null {
  if (data == null) return null
  if (typeof data === "string") return data
  if (Array.isArray(data)) {
    return data.length ? extractNullable(data[0]) : null
  }

  if (typeof data === "object") {
    const obj = data as Record<string, unknown>
    if (typeof obj.message === "string") return obj.message
    if (typeof obj.detail === "string") return obj.detail
    const error = obj.error
    if (error != null) {
      const nested = extractNullable(error)
      if (nested) return nested
    }
    for (const value of Object.values(obj)) {
      const err = extractNullable(value)
      if (err) return err
    }
  }

  return null
}
