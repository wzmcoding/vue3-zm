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

export function isOn(key) {
  return /^on[A-Z]/.test(key)
}

export const isArray = Array.isArray

export function isString(value) {
  return typeof value === 'string'
}
