import { hasOwn, isArray, ShapeFlags } from '@vue/shared'
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

/**
 * 设置所有的  props attrs
 */
function setFullProps(instance, rawProps, props, attrs) {
  const { propsOptions, vnode } = instance
  // 是不是函数式组件
  const isFunctionalComponent =
    vnode.shapeFlag & ShapeFlags.FUNCTIONAL_COMPONENT
  const hasProps = Object.keys(propsOptions).length > 0
  if (rawProps) {
    /**
     * 函数式组件：
     *  如果没有声明 props,那所有的属性都是props  => (isFunctionalComponent && !hasProps)
     *  否则，只有声明的属性是props, 其他都是attrs
     */
    for (const key in rawProps) {
      const value = rawProps[key]
      if (hasOwn(propsOptions, key) || (isFunctionalComponent && !hasProps)) {
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

/**
 * 更新组件的属性
 */
export function updateProps(instance, nextVNode) {
  const { props, attrs } = instance

  const rawProps = nextVNode.props
  /**
   * 设置所有的
   */
  setFullProps(instance, rawProps, props, attrs)

  /**
   * 删除之前有，现在没有的
   */
  for (const key in props) {
    if (!hasOwn(rawProps, key)) {
      delete props[key]
    }
  }

  for (const key in attrs) {
    if (!hasOwn(rawProps, key)) {
      delete attrs[key]
    }
  }
}
