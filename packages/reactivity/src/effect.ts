// 当前正在收集的副作用函数，在模块中导出变量，这个时候当我执行 effect 的时候，
// 我就把当前正在执行的函数，放到 activeSub 中，
// 当然这么做只是为了我们在收集依赖的时候能找到它，
// 如果你还是不理解，那你就把他想象成一个全局变量，这个时候如果执行 effect 那全局变量上就有一个正在执行的函数，就是 activeSub
export let activeSub

class ReactiveEffect {
  // 表示当前是否被激活，如果为 false 则不收集依赖
  active = true
  constructor(public fn) {}

  run() {
    // 如果当前的 effect 未激活，那就不收集依赖，直接返回 fn 执行结果
    if (!this.active) {
      return this.fn()
    }
    // 保存之前的 activeSub
    const prevSub = activeSub
    // 将当前的 effect 保存到全局，以便于收集依赖
    activeSub = this
    try {
      return this.fn()
    } finally {
      // fn 执行完毕后将 activeSub 恢复为 prevSub
      activeSub = prevSub
    }
  }
}

// effect 函数用于注册副作用函数
// 执行传入的函数，并在执行期间自动收集依赖
export function effect(fn) {
  // 创建一个 ReactiveEffect 实例
  const e = new ReactiveEffect(fn)
  e.run() // 执行 fn
}
