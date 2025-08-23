import { proxyRefs } from '@vue/reactivity'
import { initProps, normalizePropsOptions } from './componentProps'
import { isFunction } from '@vue/shared'

/**
 * 创建组件实例
 */
export function createComponentInstance(vnode, container, anchor) {
  const { type } = vnode
  const instance = {
    vnode,
    type,
    // setup 返回的状态
    setupState: {},
    /**
     * 用户声明的 props
     */
    propsOptions: normalizePropsOptions(type.props),
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
 * 初始化组件
 */
export function setupComponent(instance) {
  const { type } = instance

  console.log('instance->', instance)
  /**
   * 初始化属性
   */
  initProps(instance)
  const setupContext = createSetupContext(instance)
  if (isFunction(type.setup)) {
    const setupResult = proxyRefs(type.setup(instance.props, setupContext))
    // 拿到 setup 返回的状态
    instance.setupState = setupResult
  }
  // 将 render 函数,绑定给 instance
  instance.render = type.render
}

/**
 * 创建 setupContext
 */
function createSetupContext(instance) {
  return {
    get attrs() {
      return instance.attrs
    },
  }
}
