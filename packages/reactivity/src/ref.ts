import { activeSub } from './effect'
import { Link, link, propagate } from './system'
import { hasChanged, isObject } from '@vue/shared'
import { reactive } from './reactive'

enum ReactiveFlags {
  // 属性标记，用于表示对象是不是一个ref
  IS_REF = '__v_isRef',
}

/**
 * Ref的类
 */
class RefImpl {
  // 保存实际的值
  _value;
  // ref标记，证明是一个ref
  [ReactiveFlags.IS_REF] = true

  /**
   * 订阅者链表的头节点，理解为 head
   */
  subs: Link

  /**
   * 订阅者链表的尾节点，理解为 tail
   */
  subsTail: Link

  constructor(value) {
    this._value = isObject(value) ? reactive(value) : value
  }

  get value() {
    // 收集依赖
    if (activeSub) {
      trackRef(this)
    }
    return this._value
  }

  set value(newValue) {
    if (hasChanged(newValue, this._value)) {
      // 触发更新
      this._value = newValue
      triggerRef(this)
    }
  }
}

export function ref(value) {
  if (isRef(value)) {
    return value
  }
  return new RefImpl(value)
}

/**
 * 判断是不是一个 ref
 * @param value
 */
export function isRef(value) {
  return !!(value && value[ReactiveFlags.IS_REF])
}

/**
 * 收集依赖，建立 ref 和 effect 之间的链表联系
 * @param dep
 */
export function trackRef(dep) {
  if (activeSub) {
    link(dep, activeSub)
  }
}

/**
 * 触发 ref 关联的 effect 重新执行
 * @param dep
 */
export function triggerRef(dep) {
  if (dep.subs) {
    propagate(dep.subs)
  }
}
