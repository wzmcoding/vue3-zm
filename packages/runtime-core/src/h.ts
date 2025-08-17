/**
 * h 函数的使用方法：
 * 1. h('div', 'hello world') 第二个参数为 子节点
 * 2. h('div', [h('span', 'hello'), h('span', ' world')]) 第二个参数为 子节点
 * 3. h('div', h('span', 'hello')) 第二个参数为 子节点
 * 4. h('div', { class: 'container' }) 第二个参数是 props
 * ------
 * 5. h('div', { class: 'container' }, 'hello world')
 * 6. h('div', { class: 'container' }, h('span', 'hello world'))
 * 7. h('div', { class: 'container' }, h('span', 'hello'), h('span', 'world'))
 * 8. h('div', { class: 'container' },[h('span', 'hello'), h('span', 'world')]) 和 7 一个意思
 */
import { isArray, isObject } from '@vue/shared'

export function h(type, propsOrChildren?, children?) {
  /**
   * h 函数主要的作用是对 createVNode 做一个参数标准化 （归一化）
   */
  const l = arguments.length
  if (l === 2) {
    if (isArray(propsOrChildren)) {
      // 2. h('div', [h('span', 'hello'), h('span', ' world')]) 第二个参数为 子节点
      return createVNode(type, null, propsOrChildren)
    }

    if (isObject(propsOrChildren)) {
      if (isVNode(propsOrChildren)) {
        // 3. h('div', h('span', 'hello')) 第二个参数为 子节点
        return createVNode(type, null, [propsOrChildren])
      }
      // 4. h('div', { class: 'container' }) 第二个参数是 props, children 传了也是undefined
      return createVNode(type, propsOrChildren, children)
    }
    // 1. h('div', 'hello world')  propsOrChildren 是字符串不需要包成数组，可以直接作为 children
    return createVNode(type, null, propsOrChildren)
  } else {
    if (l > 3) {
      // 老6玩法
      /**
       * h('div', { class: 'container' }, h('span', 'hello'), h('span', 'world'))
       * 转换成
       * h('div', { class: 'container' },[h('span', 'hello'), h('span', 'world')])
       */
      children = [...arguments].slice(2)
    } else if (isVNode(children)) {
      // 6. h('div', { class: 'container' }, h('span', 'hello world'))
      children = [children]
    }
    // 其它情况都走这里
    // 5. h('div', { class: 'container' }, 'hello world')
    // 8. h('div', { class: 'container' },[h('span', 'hello'), h('span', 'world')]) 和 7 一个意思
    // 要是只传了type 也走这里，后面两个是 undefined
    return createVNode(type, propsOrChildren, children)
  }
}

/**
 * 判断是否为虚拟节点，根据 __v_isVNode 属性
 * @param value
 */
function isVNode(value) {
  return value?.__v_isVNode
}

/**
 * 创建虚拟节点的底层方法
 * @param type 节点类型
 * @param props 节点的属性
 * @param children 子节点
 */
function createVNode(type, props?, children?) {
  const vnode = {
    __v_isVNode: true, // 标记是虚拟节点
    type,
    props,
    children,
    // 做 diff 用的
    key: props?.key,
    // 虚拟节点要挂载的元素
    el: null,
    shapeFlag: 9,
  }

  return vnode
}
