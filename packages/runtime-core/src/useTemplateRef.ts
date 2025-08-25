import { ref } from '@vue/reactivity'
import { getCurrentInstance } from './component'

export function useTemplateRef(key) {
  const vm = getCurrentInstance()
  const { refs } = vm
  const elRef = ref(null)
  Object.defineProperty(refs, key, {
    get() {
      // 当用户访问 refs[key] 时，返回 elRef.value
      return elRef.value
    },
    set(value) {
      // 拦截 refs[key] = vnode.el
      elRef.value = value
    },
  })
  return elRef
}
