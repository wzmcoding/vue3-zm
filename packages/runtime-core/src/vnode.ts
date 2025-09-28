import {
  isFunction,
  isNumber,
  isObject,
  isString,
  ShapeFlags,
} from '@vue/shared'
import { getCurrentRenderingInstance } from './component'
import { isTeleport } from './components/Teleport'

/**
 * 文本节点标记
 */
export const Text = Symbol('v-txt')

export const Fragment = Symbol('Fragment')

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
function normalizeChildren(vnode, children) {
  let { shapeFlag } = vnode
  if (Array.isArray(children)) {
    shapeFlag |= ShapeFlags.ARRAY_CHILDREN
  } else if (isObject(children)) {
    /**
     * children 是对象
     * {
     *   header: () => h('div','hello world')
     * }
     */
    if (shapeFlag & ShapeFlags.COMPONENT) {
      // 如果是个组件，那么children 是 slots
      shapeFlag |= ShapeFlags.SLOTS_CHILDREN
    }
  } else if (isFunction(children)) {
    // children 是函数
    if (shapeFlag & ShapeFlags.COMPONENT) {
      // 如果是个组件，那么children 是 slots
      shapeFlag |= ShapeFlags.SLOTS_CHILDREN
      children = { default: children }
    }
  } else if (isNumber(children) || isString(children)) {
    children = String(children)
    shapeFlag |= ShapeFlags.TEXT_CHILDREN
  }

  /**
   * 处理完了，重新赋值
   */
  vnode.shapeFlag = shapeFlag
  vnode.children = children
  return children
}

function normalizeRef(ref) {
  if (ref == null) {
    return
  }
  return {
    // 原始的 ref
    r: ref,
    // 当前正在渲染的组件实例
    i: getCurrentRenderingInstance(),
  }
}

/**
 * 创建虚拟节点的底层方法
 * @param type 节点类型
 * @param props 节点的属性
 * @param children 子节点
 */
export function createVNode(type, props?, children = null) {
  let shapeFlag = 0

  if (isString(type)) {
    // div p sapn
    shapeFlag = ShapeFlags.ELEMENT
  } else if (isTeleport(type)) {
    // Teleport 组件
    shapeFlag = ShapeFlags.TELEPORT
  } else if (isObject(type)) {
    // 有状态的组件
    shapeFlag = ShapeFlags.STATEFUL_COMPONENT
  } else if (isFunction(type)) {
    // 函数式组件
    shapeFlag = ShapeFlags.FUNCTIONAL_COMPONENT
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
    // 绑定 ref
    ref: normalizeRef(props?.ref),
    appContext: null,
  }

  normalizeChildren(vnode, children)

  return vnode
}
