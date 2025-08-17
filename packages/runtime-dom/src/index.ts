import { nodeOps } from './nodeOps'
import { patchProp } from './patchProp'
import { createRenderer } from '@vue/runtime-core'

export * from '@vue/runtime-core'

const renderOptions = { patchProp, ...nodeOps }

const renderer = createRenderer(renderOptions)
export function render(vnode, container) {
  renderer.render(vnode, container)
}

export { renderOptions }
