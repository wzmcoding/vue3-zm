export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}
/**
 * 看一下值有没有变
 * @param newValue
 * @param oldValue
 */
export function hasChanged(newValue, oldValue) {
  return !Object.is(newValue, oldValue)
}

export function isFunction(value) {
  return typeof value === 'function'
}
