import { proxyRefs } from '@vue/reactivity'

/**
 * 创建组件实例
 */
export function createComponentInstance(vnode, container, anchor) {
  const instance = {
    vnode,
    type: vnode.type,
    // setup 返回的状态
    setupState: {},
    props: {},
    attrs: {},
    // 组件是否挂载
    isMounted: false,
    // 子树， render 的返回值
    subTree: null,
    // 渲染函数
    render: null,
  }
  return instance
}

/**
 * 初始化组件状态
 */
export function setupComponent(instance) {
  const { type } = instance

  const setupResult = proxyRefs(type.setup())
  // 拿到 setup 返回的状态
  instance.setupState = setupResult
  // 将 render 函数,绑定给 instance
  instance.render = type.render
}
