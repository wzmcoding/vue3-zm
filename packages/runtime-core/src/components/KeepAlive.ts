export const isKeepAlive = type => type?.__isKeepAlive

export const KeepAlive = {
  name: 'KeepAlive',
  __isKeepAlive: true,
  setup(props, { slots }) {
    /**
     * 缓存:
     * component => vnode
     * or
     * key => vnode
     */
    const cache = new Map()

    return () => {
      const vnode = slots.default()

      const key = vnode.key != null ? vnode.key : vnode.type
      /**
       * 在这里处理缓存
       */
      cache.set(key, vnode)
      console.log('cache', cache)
      return vnode
    }
  },
}
