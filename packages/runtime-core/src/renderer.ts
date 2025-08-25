import { ShapeFlags } from '@vue/shared'
import { isSameVNodeType, normalizeVNode, Text } from './vnode'
import { createAppAPI } from './apiCreateApp'
import { createComponentInstance, setupComponent } from './component'
import { ReactiveEffect } from '@vue/reactivity'
import { queueJob } from './scheduler'
import { shouldUpdateComponent } from './componentRenderUtils'
import { updateProps } from './componentProps'
import { updateSlots } from './componentSlots'
import { LifecycleHooks, triggerHooks } from './apiLifecycle'

export function createRenderer(options) {
  // 提供虚拟节点 渲染到页面上的功能
  const {
    createElement: hostCreateElement,
    insert: hostInsert,
    remove: hostRemove,
    setElementText: hostSetElementText,
    createText: hostCreateText,
    setText: hostSetText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
    patchProp: hostPatchProp,
  } = options

  // 更新 props
  const patchProps = (el, oldProps, newProps) => {
    if (oldProps) {
      // 把老的 props 都删除掉
      for (const key in oldProps) {
        hostPatchProp(el, key, oldProps[key], null)
      }
    }

    if (newProps) {
      // 把新的 props 都设置上
      for (const key in newProps) {
        hostPatchProp(el, key, oldProps?.[key], newProps[key])
      }
    }
  }

  // 更新 children
  const patchChildren = (n1, n2) => {
    const el = n2.el
    /**
     * 1. 老的是文本，新的是文本 => 直接更新文本
     * 2. 老的是文本，新的是数组 => 清空文本，挂载新的数组
     * 3. 老的是数组，新的是文本 => 卸载老的数组，设置文本
     * 4. 老的是数组，新的是数组 => diff 算
     * 老的可能是null, 新的也可能是null
     */

    const prevShapeFlag = n1.shapeFlag
    const shapeFlag = n2.shapeFlag
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 新的是文本
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 老的是数组, 卸载老的 children
        unmountChildren(n1.children)
      }

      if (n1.children !== n2.children) {
        // 如果n1和n2的children不一样，设置文本
        hostSetElementText(el, n2.children)
      }
    } else {
      // 老的是数组 或者 null ,文本
      // 新的是数组 或者 null
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        // 老的是文本，清空文本
        hostSetElementText(el, '')
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          mountChildren(n2.children, el)
        }
      } else {
        // 老的是数组或者 null
        if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          // 老的是数组
          if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            // 新的也是数组
            // TODO 全量 diff
            patchKeyedChildren(n1.children, n2.children, el)
          } else {
            // 老的是数组，新的是 null, 卸载老的数组
            unmountChildren(n1.children)
          }
        } else {
          // 老的是null
          if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            // 老的是null，新是数组, 直接挂载新数组
            mountChildren(n2.children, el)
          }
        }
      }
    }
  }

  // 全量diff
  const patchKeyedChildren = (c1, c2, container) => {
    console.log('全量 diff 逻辑 c1,c2->', c1, c2)
    /**
     * 全量diff
     *  1. 双端 diff
     *      1.1 头部对比
     *      c1 => [a, b]
     *      c2 => [a, b, c]
     *      开始时： i= 0, e1= 1, e2= 2
     *      1.2 尾部对比
     *      c1 => [a, b]
     *      c2 => [c, a, b]
     *      开始时： i= 0, e1= 1, e2= 2
     *  2. 乱序 diff
     *      c1 => [a, (b, c, d), e]
     *      c2 => [a, (c, d, b), e]
     *      开始时： i= 0, e1= 4, e2= 4
     *      双端对比完结果： i= 1, e1= 3, e2= 3
     */

    // 开始对比的下标
    let i = 0
    // 老的子节点的最后一个元素的下标
    let e1 = c1.length - 1
    // 新的子节点的最后一个元素的下标
    let e2 = c2.length - 1

    /**
     * 1.1 头部对比
     *      c1 => [a, b]
     *      c2 => [a, b, c]
     *      开始时： i= 0, e1= 1, e2= 2
     *      结束时： i= 2, e1= 1, e2= 2
     */
    while (i <= e1 && i <= e2) {
      const n1 = c1[i]
      const n2 = (c2[i] = normalizeVNode(c2[i]))
      if (isSameVNodeType(n1, n2)) {
        // 如果 n1 和 n2 是同一个类型的子节点，那就可以更新, 更新完了之后，对比下一个
        patch(n1, n2, container)
      } else {
        break
      }
      i++
    }

    /**
     *  1.2 尾部对比
     *    c1 => [a, b]
     *    c2 => [c, a, b]
     *    开始时： i= 0, e1= 1, e2= 2
     *    结束时： i= 0, e1= -1, e2= 0
     */
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1]
      const n2 = (c2[e2] = normalizeVNode(c2[e2]))
      if (isSameVNodeType(n1, n2)) {
        // 如果 n1 和 n2 是同一个类型的子节点，那就可以更新， 更新完了之后，对比上一个
        patch(n1, n2, container)
      } else {
        break
      }
      // 更新 尾指针
      e1--
      e2--
    }

    if (i > e1) {
      // 说明老的少，新的多，要挂载新的， 挂载的范围是 i到 e2

      const nextPos = e2 + 1
      const anchor = nextPos < c2.length ? c2[nextPos].el : null
      console.log('anchor->', anchor)
      while (i <= e2) {
        patch(null, (c2[i] = normalizeVNode(c2[i])), container, anchor)
        i++
      }
    } else if (i > e2) {
      // 说明新的少，老的多，要卸载老的， 卸载的范围是 i 到 e1
      while (i <= e1) {
        unmount(c1[i])
        i++
      }
    } else {
      /**
       *    2. 乱序 diff
       *      c1 => [a, (b, c, d), e]
       *      c2 => [a, (c, d, b), e]
       *      开始时： i= 0, e1= 4, e2= 4
       *      双端对比完结果： i= 1, e1= 3, e2= 3
       *      找到 key 相同的虚拟节点，让他们 patch
       */
      console.log('开始乱序 diff')
      // 老的子节点开始查找的位置
      let s1 = i
      // 新的子节点开始查找的位置
      let s2 = i

      /**
       * 做一份新的子节点的 key 和 index 的映射关系
       * map = {
       *   c: 1,
       *   d: 2,
       *   b: 3,
       * }
       */
      const keyToNewIndexMap = new Map()

      // 创建一个 newIndexToOldIndexMap, 用来记录新的子节点的 index 和 老的子节点的 index 的关系
      const newIndexToOldIndexMap = new Array(e2 - s2 + 1)
      newIndexToOldIndexMap.fill(-1) // 如果是 -1， 表示不在 patch 范围内，有可能是新增的，新的有，老的没有，不需要计算

      /**
       * 遍历新的 s2 - e2 之间，这些是还没更新的，做一份 key => index  map
       */
      for (let j = s2; j <= e2; j++) {
        const n2 = (c2[j] = normalizeVNode(c2[j]))
        keyToNewIndexMap.set(n2.key, j)
      }
      console.log('keyToNewIndexMap ->', keyToNewIndexMap)

      let pos = -1
      // 是否需要移动
      let moved = false

      /**
       * 遍历老的子节点
       */
      for (let j = s1; j <= e1; j++) {
        const n1 = c1[j]
        // 看一下这个 key 在新的里面有没有
        const newIndex = keyToNewIndexMap.get(n1.key)

        if (newIndex != null) {
          if (newIndex > pos) {
            // 如果每一次都是比上一次的大，表示就是连续递增的, 不需要算
            pos = newIndex
          } else {
            // 如果新的 index 比老的 index 小，说明需要移动
            moved = true
          }
          newIndexToOldIndexMap[newIndex] = j
          // 如果有，就patch
          patch(n1, c2[newIndex], container)
        } else {
          // 如果没有， 说明老的有，新的没有，需要卸载
          unmount(n1)
        }
      }
      console.log('newIndexToOldIndexMap ->', newIndexToOldIndexMap)
      // 最长递增子序列

      if (moved) {
        console.log('moved 需要计算')
      } else {
        console.log('不需要计算')
      }
      // 如果 moved 为 false,表示不需要移动，就别计算了
      const newIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : []
      console.log('最长递增子序列 不用动 newIndexSequence->', newIndexSequence)
      // 换成 Set, 性能好一点
      const sequenceSet = new Set(newIndexSequence)
      /**
       * 遍历新的子元素， 调整顺序
       */

      for (let j = e2; j >= s2; j--) {
        /**
         * 倒序插入
         */
        const n2 = c2[j]
        // 拿到它的下一个子元素
        const anchor = c2[j + 1]?.el || null
        if (n2.el) {
          if (moved) {
            // 如果下标 j 不在最长递增子序列中，，表示需要移动
            if (!sequenceSet.has(j)) {
              // 依次进行倒序插入，保证顺序的一致性
              hostInsert(n2.el, container, anchor)
            }
          }
        } else {
          // 表示老的没有，新的有，挂载新的
          patch(null, n2, container, anchor)
        }
      }
    }
    console.log('i,e1,e2->', i, e1, e2)
  }

  // 更新
  const patchElement = (n1, n2) => {
    /**
     * 1. 复用 dom 元素
     * 2. 更新 props
     * 3. 更新 children
     */
    // 复用 dom 元素
    const el = (n2.el = n1.el)

    // 更新 props
    const oldProps = n1.props
    const newProps = n2.props
    patchProps(el, oldProps, newProps)

    // 更新 children
    patchChildren(n1, n2)
  }

  // 卸载子元素
  const unmountChildren = children => {
    for (let i = 0; i < children.length; i++) {
      unmount(children[i])
    }
  }

  // 卸载
  const unmount = vnode => {
    const { type, shapeFlags, children } = vnode

    if (shapeFlags & ShapeFlags.ARRAY_CHILDREN) {
      // 子节点是数组
      unmountChildren(children)
    }
    hostRemove(vnode.el)
  }

  // 挂载子元素
  const mountChildren = (children, el) => {
    for (let i = 0; i < children.length; i++) {
      // 进行标准化 vnode
      const child = (children[i] = normalizeVNode(children[i]))
      patch(null, child, el)
    }
  }

  // 挂载
  const mountElement = (vnode, container, anchor) => {
    /**
     * 1. 创建一个 dom 节点
     * 2. 设置它的 props
     * 3. 挂载它的子节点
     */
    const { type, props, children, shapeFlag } = vnode
    // 创建 dom 元素, type = div, span, p 等
    const el = hostCreateElement(type)
    // vnode.el 用于存储真实的 dom 元素
    vnode.el = el
    // 处理 props
    if (props) {
      for (const key in props) {
        hostPatchProp(el, key, null, props[key])
      }
    }

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 子节点是文本
      hostSetElementText(el, children)
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // 子节点是数组
      mountChildren(children, el)
    }

    // 插入元素, 挂载到容器中
    hostInsert(el, container, anchor)
  }

  /**
   * 处理元素的挂载和更新
   */
  const processElement = (n1, n2, container, anchor) => {
    if (n1 == null) {
      // 挂载
      mountElement(n2, container, anchor)
    } else {
      // 更新
      patchElement(n1, n2)
    }
  }

  /**
   * 处理文本的挂载和更新
   */
  const processText = (n1, n2, container, anchor) => {
    if (n1 == null) {
      // 挂载
      hostInsert((n2.el = hostCreateText(n2.children)), container, anchor)
    } else {
      // 更新
      const el = (n2.el = n1.el)
      if (n2.children !== n1.children) {
        hostSetElementText(el, n2.children)
      }
    }
  }

  const updateComponentPreRender = (instance, nextVNode) => {
    /**
     * 复用组件实例
     * 更新 props
     * 更新 slots
     */
    // 更新虚拟节点
    instance.vnode = nextVNode
    instance.next = null
    /**
     * 更新组件的属性
     */
    updateProps(instance, nextVNode)
    /**
     * 更新组件的 slots
     */
    updateSlots(instance, nextVNode)
  }

  const setupRenderEffect = (instance, container, anchor) => {
    const componentUpdateFn = () => {
      /**
       * 区分挂载和更新
       */
      if (!instance.isMounted) {
        // 挂载的逻辑
        const { vnode, render } = instance

        /**
         * 挂载前，触发 beforeMount
         */
        triggerHooks(instance, LifecycleHooks.BEFORE_MOUNT)

        // 调用 render 拿到 subTree, this 先指向 setupState,后面指向proxy,因为要访问this.xxx
        // const subTree = instance.render.call(instance.setupState)
        const subTree = render.call(instance.proxy)
        // 将 subTree 挂载到页面
        patch(null, subTree, container, anchor)
        // 组件的 vnode 的 el, 会指向 subTree 的 el, 它们是相同的
        vnode.el = subTree.el
        // 保存子树
        instance.subTree = subTree
        instance.isMounted = true
      } else {
        // 更新
        let { vnode, render, next } = instance
        if (next) {
          // 父组件传递属性，触发的更新
          updateComponentPreRender(instance, next)
        } else {
          // 自身属性触发的更新
          next = vnode
        }
        const preSubTree = instance.subTree
        const subTree = render.call(instance.proxy)
        patch(preSubTree, subTree, container, anchor)
        // 组件的 vnode 的 el, 会指向 subTree 的 el, 它们是相同的
        next.el = subTree.el
        instance.subTree = subTree
      }
    }

    const effect = new ReactiveEffect(componentUpdateFn)
    const update = effect.run.bind(effect)

    instance.update = update
    effect.scheduler = () => {
      queueJob(update)
    }

    update()
  }

  /**
   * 挂载组件
   */
  const mountComponent = (vnode, container, anchor) => {
    /**
     * 1.创建组件实例
     * 2.初始化组件状态
     * 3.将组件挂载到页面中
     */

    // 创建组件实例
    const instance = createComponentInstance(vnode, container, anchor)
    // 保存组件实例到 vnode， 方便后续复用
    vnode.component = instance
    // 初始化组件状态
    setupComponent(instance)

    setupRenderEffect(instance, container, anchor)
  }

  const updateComponent = (n1, n2) => {
    const instance = (n2.component = n1.component)
    /**
     * 该更新： props 或者 slots 发生了变化
     * 不该更新： 啥都没变
     */
    if (shouldUpdateComponent(n1, n2)) {
      // 变了,需要更新
      console.log('shouldUpdateComponent -> true 需要更新')
      // 绑定新的虚拟节点到 instance
      instance.next = n2

      instance.update()
    } else {
      // 没有任何属性发生变化，不需要更新，但是需要复用元素，更新虚拟节点
      // 复用元素
      n2.el = n1.el
      // 更新虚拟节点
      instance.vnode = n2
    }
  }

  /**
   * 处理组件的挂载和更新
   */
  const processComponent = (n1, n2, container, anchor) => {
    if (n1 == null) {
      // 挂载
      mountComponent(n2, container, anchor)
    } else {
      // 更新, 父组件传递的属性发生变化，会走这里
      updateComponent(n1, n2)
    }
  }

  /**
   * 更新和挂载，都用这个函数
   * @param n1 老节点，之前的，如果有，表示要和 n2 做 diff,更新，如果没有，表示直接挂载n2
   * @param n2 新节点
   * @param container 要挂载的容器
   * @param anchor
   */
  const patch = (n1, n2, container, anchor = null) => {
    if (n1 === n2) {
      // 如果两次传递了同一个虚拟节点，啥也不干
      return
    }

    if (n1 && !isSameVNodeType(n1, n2)) {
      unmount(n1) // 卸载, 如果 n1有，且节点类型不同，则直接卸载 n1
      n1 = null // 置空 n1, 挂载新的 n2
    }

    /**
     * 元素，文本，组件
     */
    const { shapeFlag, type } = n2
    switch (type) {
      case Text:
        // 处理文本
        processText(n1, n2, container, anchor)
        break
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          // 处理 dom 元素 div, p, span
          processElement(n1, n2, container, anchor)
        } else if (shapeFlag & ShapeFlags.COMPONENT) {
          // 组件
          processComponent(n1, n2, container, anchor)
        }
    }
  }

  const render = (vnode, container) => {
    /**
     * 分三步：
     * 1.挂载
     * 2.更新
     * 3.卸载
     */

    if (vnode == null) {
      if (container._vnode) {
        // 如果旧节点有，则卸载
        unmount(container._vnode)
      }
    } else {
      // 如果 vnode 有值，则表示要挂载或更新
      patch(container._vnode || null, vnode, container)
    }

    container._vnode = vnode // 把虚拟节点存到容器上，方便下次更新
  }

  return {
    render,
    createApp: createAppAPI(render),
  }
}

/**
 * 求最长递增子序列
 * 目的就是 减少dom移动的次数
 * 如果一开始，新的，老的顺序本来就是递增的，那么就不用计算了
 */
function getSequence(arr) {
  const result = []
  // 记录前驱节点
  const map = new Map()

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i]
    // -1 不在计算范围内
    if (item === -1 || item === undefined) continue

    if (result.length === 0) {
      // 如果 result 里面一个都没有，把当前的索引放进去
      result.push(i)
      continue
    }

    const lastIndex = result[result.length - 1]
    const lastItem = arr[lastIndex]

    if (item > lastItem) {
      // 如果当前这一项大于上一个，那么就直接把索引放到 result 中
      result.push(i)
      // 记录前驱节点
      map.set(i, lastIndex)
      continue
    }
    // item 小于 lastItem

    let left = 0
    let right = result.length - 1

    while (left < right) {
      const mid = Math.floor((left + right) / 2)
      // 拿到中间项
      const midItem = arr[result[mid]]
      if (midItem < item) {
        left = mid + 1
      } else {
        right = mid
      }
    }

    if (arr[result[left]] > item) {
      if (left > 0) {
        // 记录前驱节点
        map.set(i, result[left - 1])
      }
      // 找到最合适的，把索引替换进去
      result[left] = i
    }
  }

  // 反向追溯
  let l = result.length
  let last = result[l - 1]

  while (l > 0) {
    l--
    // 纠正顺序
    result[l] = last
    // 去前驱节点里面找
    last = map.get(last)
  }

  return result
}
