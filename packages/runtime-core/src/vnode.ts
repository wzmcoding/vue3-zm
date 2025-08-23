import { isNumber, isObject, isString, ShapeFlags } from '@vue/shared'

/**
 * 文本节点标记
 */
export const Text = Symbol('v-txt')

export function isSameVNodeType(n1, n2) {
  return n1.type === n2.type && n1.key === n2.key
}

export function normalizeVNode(vnode) {
  if (isString(vnode) || isNumber(vnode)) {
    // 如果是字符串或者数字，则创建文本节点
    return createVNode(Text, null, String(vnode))
  }
  return vnode
}

/**
 * 判断是否为虚拟节点，根据 __v_isVNode 属性
 * @param value
 */
export function isVNode(value) {
  return value?.__v_isVNode
}

/**
 * 标准化子节点
 * @param children
 */
function normalizeChildren(children) {
  if (isNumber(children)) {
    children = String(children)
  }
  return children
}

/**
 * 创建虚拟节点的底层方法
 * @param type 节点类型
 * @param props 节点的属性
 * @param children 子节点
 */
export function createVNode(type, props?, children = null) {
  let shapeFlag = 0

  children = normalizeChildren(children)

  if (isString(type)) {
    // div p sapn
    shapeFlag = ShapeFlags.ELEMENT
  } else if (isObject(type)) {
    // 有状态的组件
    shapeFlag = ShapeFlags.STATEFUL_COMPONENT
  }

  if (isString(children)) {
    shapeFlag |= ShapeFlags.TEXT_CHILDREN
  } else if (Array.isArray(children)) {
    shapeFlag |= ShapeFlags.ARRAY_CHILDREN
  }

  const vnode = {
    __v_isVNode: true, // 标记是虚拟节点
    type,
    props,
    children,
    // 做 diff 用的
    key: props?.key,
    // 虚拟节点要挂载的元素
    el: null,
    shapeFlag,
  }

  return vnode
}
