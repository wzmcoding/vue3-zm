import { ShapeFlags } from '@vue/shared'
import { isSameVNodeType } from './vnode'

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
            console.log('全量 diff 算法', n1, n2)
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
      const child = children[i]
      patch(null, child, el)
    }
  }

  // 挂载
  const mountElement = (vnode, container) => {
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
    hostInsert(el, container)
  }

  /**
   * 更新和挂载，都用这个函数
   * @param n1 老节点，之前的，如果有，表示要和 n2 做 diff,更新，如果没有，表示直接挂载n2
   * @param n2 新节点
   * @param container 要挂载的容器
   */
  const patch = (n1, n2, container) => {
    if (n1 === n2) {
      // 如果两次传递了同一个虚拟节点，啥也不干
      return
    }

    if (n1 && !isSameVNodeType(n1, n2)) {
      unmount(n1) // 卸载, 如果 n1有，且节点类型不同，则直接卸载 n1
      n1 = null // 置空 n1, 挂载新的 n2
    }

    if (n1 == null) {
      // 挂载
      mountElement(n2, container)
    } else {
      // 更新
      patchElement(n1, n2)
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
  }
}
