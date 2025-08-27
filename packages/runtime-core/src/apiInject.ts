import { getCurrentInstance } from './component'

export function provide(key, value) {
  /**
   * provides: parent ? parent.provides : appContext.provides,
   * 首次调用， instance.provides = parent.provides
   */
  const instance = getCurrentInstance()
  // 拿到父组件的 provides, 如果父组件没有，证明是 根组件， 应该拿 appContext.provides
  const parentProvides = instance.parent
    ? instance.parent?.provides
    : instance.appContext.provides
  // 自己的 provides
  let provides = instance.provides
  if (provides === parentProvides) {
    instance.provides = Object.create(parentProvides)
    provides = instance.provides
  }

  provides[key] = value
}

export function inject(key, defaultValue) {
  const instance = getCurrentInstance()
  // 拿到父组件的 provides, 如果父组件没有，证明是 根组件， 应该拿 appContext.provides
  const parentProvides = instance.parent
    ? instance.parent?.provides
    : instance.appContext.provides

  if (key in parentProvides) {
    // 如果父组件的 provides 上面有这个 key, 那就返回
    return parentProvides[key]
  }
  // 如果没有，返回默认值
  return defaultValue
}
