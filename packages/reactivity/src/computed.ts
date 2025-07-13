import { hasChanged, isFunction } from '@vue/shared'
import { Dependency, endTrack, link, Link, startTrack, Sub } from './system'
import { ReactiveFlags } from './ref'
import { activeSub, setActiveSub } from './effect'

class ComputedRefImpl implements Sub, Dependency {
  // computed 也是一个 ref，通过 isRef 也返回 true
  [ReactiveFlags.IS_REF] = true

  // 保存 fn 的返回值
  _value

  //region 作为 dep，要关联 subs，等我的值更新了，我要通知它们重新执行
  /**
   * 订阅者链表的头节点，理解为我们将的 head
   */
  subs: Link

  /**
   * 订阅者链表的尾节点，理解为我们讲的 tail
   */
  subsTail: Link
  //endregion

  //region 作为 sub，我要知道哪些 dep，被我收集了
  /**
   * 依赖项链表的头节点
   */
  deps: Link | undefined

  /**
   * 依赖项链表的尾节点
   */
  depsTail: Link | undefined

  tracking = false
  //endregion

  // 计算属性，脏不脏，如果 dirty 为 true，表示计算属性是脏的，get value 的时候，需要执行 update
  dirty = true

  constructor(
    public fn, // getter
    private setter,
  ) {}

  get value() {
    if (this.dirty) {
      // 如果计算属性脏了，执行 update
      this.update()
    }
    /**
     * 作为 dep 要和 sub 做关联关系
     */
    if (activeSub) {
      link(this, activeSub)
    }
    return this._value
  }

  set value(newValue) {
    if (this.setter) {
      this.setter(newValue)
    } else {
      console.warn('Computed value is readonly, cannot set value directly.')
    }
  }

  update() {
    /**
     * 实现 sub 的功能，为了在 执行 fn 期间，收集 fn 执行过程中访问到的响应式数据
     * 建立 dep 和 sub 之间的关联关系
     */
    // 先将当前的 effect 保存起来，用来处理嵌套的逻辑
    const prevSub = activeSub

    // 每次执行 fn 之前，把 this 放到 activeSub 上面
    setActiveSub(this)
    startTrack(this)
    try {
      // 拿到老值
      const oldValue = this._value
      // 拿到新的值
      this._value = this.fn()
      // 如果值发生了变化，就返回 true，否则就是 false
      return hasChanged(this._value, oldValue)
    } finally {
      endTrack(this)
      // 执行完成后，恢复之前的 effect
      setActiveSub(prevSub)
    }
  }
}

export function computed(getterOrOptions) {
  let getter, setter

  if (isFunction(getterOrOptions)) {
    // 如果传递了函数，那就是 getter
    getter = getterOrOptions
  } else {
    // 否则就是对象，从对象中获取到 get 和 set
    getter = getterOrOptions.get
    setter = getterOrOptions.set
  }
  // 将 getter 和 setter 传递给 ComputedRefImpl
  return new ComputedRefImpl(getter, setter)
}
