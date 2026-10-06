export function editFormValues(row: Record<string, unknown>, dateKeys: string[]) {
  const values = { ...row }
  for (const key of dateKeys) {
    const value = values[key]
    // Database dates arrive as ISO timestamps. Keep their calendar date without timezone conversion.
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      values[key] = value.slice(0, 10)
    }
  }
  return values
}
