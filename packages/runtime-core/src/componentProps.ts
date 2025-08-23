import { hasOwn, isArray } from '@vue/shared'
import { reactive } from '@vue/reactivity'

export function normalizePropsOptions(props = {}) {
  /**
   * 要把数组转换成对象
   */
  if (isArray(props)) {
    return props.reduce((prev, cur) => {
      prev[cur] = {}
      return prev
    }, {})
  }
  return props
}

function setFullProps(instance, rawProps, props, attrs) {
  const propsOptions = instance.propsOptions
  if (rawProps) {
    for (const key in rawProps) {
      const value = rawProps[key]
      if (hasOwn(propsOptions, key)) {
        // 如果propsOptions 中有这个属性，那么就是用户声明的 props
        props[key] = value
      } else {
        attrs[key] = value
      }
    }
  }
}

export function initProps(instance) {
  const { vnode } = instance
  const rawProps = vnode.props

  const props = {}
  const attrs = {}
  setFullProps(instance, rawProps, props, attrs)

  // props 是响应式的
  instance.props = reactive(props)
  // attrs 不是响应式的
  instance.attrs = attrs
}
