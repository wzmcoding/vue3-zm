import { h } from './h'
import { isFunction } from '@vue/shared'
import { ref } from '@vue/reactivity'

export function defineAsyncComponent(options) {
  if (isFunction(options)) {
    options = { loader: options }
  }

  const defaultComponent = h('span', null, '')

  const {
    loader,
    loadingComponent = defaultComponent,
    errorComponent = defaultComponent,
    timeout,
  } = options

  return {
    setup(props, { slots, attrs }) {
      const component = ref(loadingComponent)

      function loadComponent() {
        return new Promise((resolve, reject) => {
          if (timeout && timeout > 0) {
            setTimeout(() => {
              reject(new Error('timeout'))
            }, timeout)
          }
          loader().then(resolve, reject)
        })
      }

      loadComponent().then(
        comp => {
          if (comp && comp[Symbol.toStringTag] === 'Module') {
            // @ts-ignore
            comp = comp.default
          }
          component.value = comp
        },
        err => {
          component.value = errorComponent
        },
      )
      return () =>
        h(
          component.value,
          {
            ...attrs,
            ...props,
          },
          slots,
        )
    },
  }
}
