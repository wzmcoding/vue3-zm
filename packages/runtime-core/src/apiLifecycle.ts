import {
  getCurrentInstance,
  setCurrentInstance,
  unsetCurrentInstance,
} from './component'

export enum LifecycleHooks {
  // 挂载 instance.bm
  BEFORE_MOUNT = 'bm',
  MOUNTED = 'm',

  // 更新
  BEFORE_UPDATE = 'bu',
  UPDATED = 'u',

  // 卸载
  BEFORE_UNMOUNT = 'bum',
  UNMOUNTED = 'um',
}

/**
 * 挂载：
 *  onBeforeMount
 *  onMounted
 *
 * 更新：
 *  onBeforeUpdate
 *  onUpdated
 *
 *  卸载：
 *  onBeforeUnmount
 *  onUnmounted
 */

function createHook(type) {
  return (hook, target = getCurrentInstance()) => {
    injectHook(target, hook, type)
  }
}

/**
 * 注入组件生命周期
 * @param target 当前组件的实例
 * @param hook 用户传递的回调函数
 * @param type 生命周期的类型， bm | m | bu | u | bum | um
 */
function injectHook(target, hook, type) {
  if (target) {
    const hooks = target[type] || (target[type] = [])

    /**
     * 重写了一下，确保用户能访问到 currentInstance
     */
    const _hooks = () => {
      setCurrentInstance(target)
      hook()
      unsetCurrentInstance()
    }
    hooks.push(_hooks)
  }
}

// 挂载
export const onBeforeMount = createHook(LifecycleHooks.BEFORE_MOUNT)
export const onMounted = createHook(LifecycleHooks.MOUNTED)
// 更新
export const onBeforeUpdate = createHook(LifecycleHooks.BEFORE_UPDATE)
export const onUpdated = createHook(LifecycleHooks.UPDATED)
// 卸载
export const onBeforeUnmount = createHook(LifecycleHooks.BEFORE_UNMOUNT)
export const onUnmounted = createHook(LifecycleHooks.UNMOUNTED)

/**&
 * 触发生命周期钩子
 * @param instance 当前组件实例
 * @param type 生命周期钩子类型 bm | m | bu | u | bum | um
 */
export function triggerHooks(instance, type) {
  instance[type]?.forEach(hook => hook())
}
