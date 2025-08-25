import { isRef } from '@vue/reactivity'
import { isString, ShapeFlags } from '@vue/shared'
import { getComponentPublicInstance } from './component'

export function setRef(ref, vnode) {
  const { shapeFlag } = vnode || {}
  const { r: rawRef, i: instance } = ref

  if (vnode == null) {
    // 卸载, 要清除这些引用
    if (isRef(rawRef)) {
      // 如果是 ref，就给他设置成 null
      rawRef.value = null
    } else if (isString(rawRef)) {
      // 字符串，修改 refs[key] = null
      instance.refs[rawRef] = null
    }
    return
  }

  if (isRef(rawRef)) {
    // 如果 ref 是一个响应式的 ref
    if (shapeFlag & ShapeFlags.COMPONENT) {
      // vnode 是一个组件类型
      rawRef.value = getComponentPublicInstance(vnode.component)
    } else {
      // vnode 是一个 dom 元素类型
      rawRef.value = vnode.el
    }
  } else if (isString(rawRef)) {
    // 如果 ref 是一个字符串, 把 vnode.el 绑定到 instance.$refs[ref] 上面
    if (shapeFlag & ShapeFlags.COMPONENT) {
      // 组件
      instance.refs[rawRef] = getComponentPublicInstance(vnode.component)
    } else {
      // DOM 元素
      instance.refs[rawRef] = vnode.el
    }
  }
}
