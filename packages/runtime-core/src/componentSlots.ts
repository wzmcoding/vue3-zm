import { hasOwn, ShapeFlags } from '@vue/shared'

export function initSlots(instance) {
  const { slots, vnode } = instance
  if (vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
    const { children } = vnode
    /**
     * children = { header: () => h('div', 'hello world') }
     * slots = {}
     */
    for (const key in children) {
      slots[key] = children[key]
    }
  }
}

export function updateSlots(instance, vnode) {
  const { slots } = instance

  if (vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
    // 组件的子元素是插槽
    const { children } = vnode
    /**
     * children = { header: () => h('div', 'hello world') }
     * slots = {}
     */
    for (const key in children) {
      slots[key] = children[key]
    }

    /**
     * 把之前 slots 有现在没有的删除
     */
    for (const key in slots) {
      if (!hasOwn(children, key)) {
        delete slots[key]
      }
    }
  }
}
