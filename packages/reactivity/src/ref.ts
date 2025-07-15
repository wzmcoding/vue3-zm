import { activeSub } from './effect'
import { Dependency, Link, link, propagate } from './system'
import { hasChanged, isObject } from '@vue/shared'
import { reactive } from './reactive'

export enum ReactiveFlags {
  // 属性标记，用于表示对象是不是一个ref
  IS_REF = '__v_isRef',
}

/**
 * Ref的类
 */
class RefImpl implements Dependency {
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

class ObjectRefImpl {
  [ReactiveFlags.IS_REF] = true

  constructor(
    public _object,
    public _key,
  ) {}

  get value() {
    return this._object[this._key]
  }
  set value(newValue) {
    this._object[this._key] = newValue
  }
}

export function toRef(target, key) {
  return new ObjectRefImpl(target, key)
}

export function toRefs(target) {
  let res = {}
  for (const key in target) {
    res[key] = new ObjectRefImpl(target, key)
  }

  return res
}

export function unref(value) {
  return isRef(value) ? value.value : value
}

export function proxyRefs(target) {
  return new Proxy(target, {
    get(...args) {
      let res = Reflect.get(...args)
      return unref(res)
    },
    set(target, key, newValue, receiver) {
      const oldValue = target[key]

      if (isRef(oldValue) && !isRef(newValue)) {
        oldValue.value = newValue
        return true
      }

      return Reflect.set(target, key, newValue, receiver)
    },
  })
}
