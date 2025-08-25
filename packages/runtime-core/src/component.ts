import { proxyRefs } from '@vue/reactivity'
import { initProps, normalizePropsOptions } from './componentProps'
import { hasOwn, isFunction, isObject } from '@vue/shared'
import { nextTick } from './scheduler'
import { initSlots } from './componentSlots'

/**
 * 创建组件实例
 */
export function createComponentInstance(vnode, container, anchor) {
  const { type } = vnode
  const instance: any = {
    vnode,
    type,
    // setup 返回的状态
    setupState: {},
    /**
     * 用户声明的 props
     */
    propsOptions: normalizePropsOptions(type.props),
    attrs: {},
    // 组件的插槽
    slots: {},
    refs: {},
    // 组件是否挂载
    isMounted: false,
    // 子树， render 的返回值
    subTree: null,
    // 渲染函数
    render: null,
  }

  instance.ctx = {
    _: instance,
  }
  // instance.emit = (event, ...args) => emit(instance, event, ...args)
  instance.emit = emit.bind(null, instance)
  return instance
}

/**
 * 初始化组件
 */
export function setupComponent(instance) {
  /**
   * 初始化属性
   * 初始化插槽
   * 初始化状态
   */
  // 初始化属性
  initProps(instance)
  // 初始化插槽
  initSlots(instance)
  // 初始化状态
  setupStatefulComponent(instance)
}

const publicPropertiesMap = {
  $el: instance => instance.vnode.el,
  $emit: instance => instance.emit,
  $attrs: instance => instance.attrs,
  $slots: instance => instance.slots,
  $refs: instance => instance.refs,
  $nextTick: instance => {
    return nextTick.bind(instance)
  },
  $forceUpdate: instance => {
    return () => instance.update()
  },
}

const publicInstanceProxyHandlers = {
  get(target, key) {
    const { _: instance } = target

    const { setupState, props } = instance
    /**
     * 如果访问了某个属性，则优先从 setupState 中取，如果没有，则从 props 中取
     */
    if (hasOwn(setupState, key)) {
      return setupState[key]
    }
    if (hasOwn(props, key)) {
      return props[key]
    }

    /**
     * $attrs
     * $slots
     * $refs
     */
    if (hasOwn(publicPropertiesMap, key)) {
      const publicGetter = publicPropertiesMap[key]
      return publicGetter(instance)
    }

    /**
     * 如果访问了不存在的属性，则从 instance 中取
     */
    return instance[key]
  },
  set(target, key, value) {
    const { _: instance } = target

    const { setupState } = instance
    if (hasOwn(setupState, key)) {
      setupState[key] = value
    }
    return true
  },
}

function setupStatefulComponent(instance) {
  const { type } = instance

  /**
   * 创建代理对象，内部访问 setupState props $attrs $slots $refs
   */
  instance.proxy = new Proxy(instance.ctx, publicInstanceProxyHandlers)

  if (isFunction(type.setup)) {
    const setupContext = createSetupContext(instance)
    instance.setupContext = setupContext
    /**
     * 设置当前组件实例
     */
    setCurrentInstance(instance)
    // 执行 setup 函数
    const setupResult = type.setup(instance.props, setupContext)

    /**
     * 清除当前组件实例
     */
    unsetCurrentInstance()

    handleSetupResult(instance, setupResult)
  }

  if (!instance.render) {
    // 如果上面处理完了， instance 还是没有 render 函数，那就去组件的配置里面找
    instance.render = type.render
  }
}

function handleSetupResult(instance, setupResult) {
  if (isFunction(setupResult)) {
    //如果 setup 返回了函数，就认定为是 render
    instance.render = setupResult
  } else if (isObject(setupResult)) {
    // 如果返回了对象，就是状态
    instance.setupState = proxyRefs(setupResult)
  }
}

/**
 * 创建 setupContext
 */
function createSetupContext(instance) {
  return {
    // 除了 props 之外的属性
    get attrs() {
      return instance.attrs
    },
    // 处理事件
    emit(event, ...args) {
      emit(instance, event, ...args)
    },
    // 插槽
    slots: instance.slots,
    // 暴露属性
    expose(exposed) {
      // 把用户传递的对象，保存到当前组件实例上
      instance.exposed = exposed
    },
  }
}

/**
 * 获取到组件公开的属性
 * @param instance
 */
export function getComponentPublicInstance(instance) {
  if (instance.exposed) {
    /**
     * 用户可以访问 exposed 和 publicPropertiesMap
     */

    // 如果有 exposedProxy， 则返回
    if (instance.exposedProxy) {
      return instance.exposedProxy
    }
    // 创建代理对象
    instance.exposedProxy = new Proxy(proxyRefs(instance.exposed), {
      get(target, key) {
        if (key in target) {
          // 用户访问了，exposed 中的属性
          return target[key]
        }
        if (key in publicPropertiesMap) {
          // $el $props $slots $refs $attrs
          return publicPropertiesMap[key](instance)
        }
      },
    })
    return instance.exposedProxy
  } else {
    // 如果没有手动暴露，返回代理对象 proxy
    return instance.proxy
  }
}

/**
 * 处理组件传递的事件
 */
function emit(instance, event, ...args) {
  const eventName = `on${event[0].toUpperCase()}${event.slice(1)}`
  const handler = instance.vnode.props[eventName]
  if (isFunction(handler)) {
    handler(...args)
  }
}

/**
 * 当前组件实例
 */

let currentInstance = null

/**
 * 设置当前组件实例
 */
export function setCurrentInstance(instance) {
  currentInstance = instance
}

/**
 * 获取当前组件实例
 */
export function getCurrentInstance() {
  return currentInstance
}

/**
 * 清除
 */
export function unsetCurrentInstance() {
  currentInstance = null
}

/**
 * 当前正在渲染的组件实例
 */
let currentRenderingInstance = null

export function setCurrentRenderingInstance(instance) {
  currentRenderingInstance = instance
}

export function unsetCurrentRenderingInstance() {
  currentRenderingInstance = null
}

export function getCurrentRenderingInstance() {
  return currentRenderingInstance
}
