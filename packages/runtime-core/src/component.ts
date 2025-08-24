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
  console.log('instance->', instance)

  /**
   * 创建代理对象，内部访问 setupState props $attrs $slots $refs
   */
  instance.proxy = new Proxy(instance.ctx, publicInstanceProxyHandlers)

  if (isFunction(type.setup)) {
    const setupContext = createSetupContext(instance)
    instance.setupContext = setupContext
    const setupResult = type.setup(instance.props, setupContext)

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
