export const isTeleport = type => type?.__isTeleport

export const Teleport = {
  name: 'Teleport',
  // Teleport 组件的标记
  __isTeleport: true,
  props: {
    to: {
      // 要挂载到选择器为 to 的容器中
      type: String,
    },
    disabled: {
      // 表示是否禁用 Teleport，如果禁用的话，那就把子节点挂载到 container 中
      type: Boolean,
    },
  },
  process(n1, n2, container, anchor, parentComponent, internals) {
    const {
      mountChildren,
      patchChildren,
      options: { querySelector, insert },
    } = internals
    /**
     * 1. 挂载
     * 2. 更新
     */
    const { to, disabled } = n2.props
    if (n1 == null) {
      // 挂载
      /**
       * 挂载的逻辑，就是把 n2.children 挂载到选择器为 to 的容器中
       */
      // 如果禁用，就挂载到 container 中，否则就去根据 to 这个选择器查询 dom
      const target = disabled ? container : querySelector(to)
      if (target) {
        // 保存目标元素
        n2.target = target
        // 把 n2.children 挂载到目标元素上
        mountChildren(n2.children, target, parentComponent)
      }
    } else {
      // 更新
      patchChildren(n1, n2, n1.target, parentComponent)
      n2.target = n1.target

      const prevProps = n1.props
      if (prevProps.to !== to || prevProps.disabled !== disabled) {
        /**
         * 需要移动子节点的情况
         * 1. to 改变， 将原来的 子节点移动到新的 target 中
         * 2. disabled 改变
         */
        const target = disabled ? container : querySelector(to)
        for (const child of n2.children) {
          insert(child.el, target)
        }
        // 重新设置 新的 target
        n2.target = target
      }
    }
  },
}
