import { ShapeFlags } from '@vue/shared'
import { getCurrentInstance } from '@vue/runtime-core'

export const isKeepAlive = type => type?.__isKeepAlive

export const KeepAlive = {
  name: 'KeepAlive',
  __isKeepAlive: true,
  props: ['max'],
  setup(props, { slots }) {
    const instance = getCurrentInstance()

    const { options, unmount } = instance.ctx.renderer
    const { createElement, insert } = options

    /**
     * 缓存:
     * component => vnode
     * or
     * key => vnode
     */
    const cache = new LRUCache(props.max)

    const storageContainer = createElement('div')

    /**
     * 激活的时候， renderer.ts 里面会调用这个方法
     * 在 KeepAlive 中，需要将之前缓存的DOM元素，移动到container中
     */
    instance.ctx.activate = (vnode, container, anchor) => {
      insert(vnode.el, container, anchor)
    }

    /**
     * 虽然 unmount 不卸载了，但是我自己需要把这个虚拟节点的 dom 给放到某一个地方去，我不希望它还在页面上
     * @param vnode
     */
    instance.ctx.deactivate = vnode => {
      insert(vnode.el, storageContainer)
    }

    return () => {
      const vnode = slots.default()

      const key = vnode.key != null ? vnode.key : vnode.type

      const cachedVNode = cache.get(key)
      if (cachedVNode) {
        /**
         * 复用缓存过的组件实例
         * 复用缓存过的 dom 元素
         */
        vnode.component = cachedVNode.component
        vnode.el = cachedVNode.el
        /**
         * 再打个标记，告诉 renderer.ts 里面不要让它重新挂载，我要复用之前的
         */
        vnode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE
      }
      /**
       * 在这里处理缓存
       */
      const _vnode = cache.set(key, vnode)
      if (_vnode) {
        resetShapeFlag(_vnode)
        unmount(_vnode)
      }

      /**
       * 打个标记，告诉 unmount 函数，这个节点需要被缓存，而不是卸载
       */
      vnode.shapeFlag |= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE

      return vnode
    }
  },
}

function resetShapeFlag(vnode) {
  vnode.shapeFlag &= ~ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE
  vnode.shapeFlag &= ~ShapeFlags.COMPONENT_KEPT_ALIVE
}

class LRUCache {
  max
  cache = new Map()
  constructor(max = Infinity) {
    this.max = max
  }

  get(key) {
    const value = this.cache.get(key)
    if (value) {
      this.cache.delete(key)
      this.cache.set(key, value)
    }
    return value
  }

  set(key, value) {
    let vnode
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.max) {
      const firstKey = this.cache.keys().next().value
      vnode = this.cache.get(firstKey)
      this.cache.delete(firstKey)
    }
    this.cache.set(key, value)
    return vnode
  }
}
