import { h } from './h'

export function createAppAPI(render) {
  return function createApp(rootComponent, rootProps) {
    const app = {
      _container: null,
      mount(container) {
        /**
         * 已经有的：
         * 根组件、根属性
         * 要挂载的容器
         */

        // 创建组件的虚拟节点
        const vnode = h(rootComponent, rootProps)
        // 将组件的虚拟节点挂载到容器上
        render(vnode, container)
        app._container = container
      },
      unmount() {
        // 卸载
        render(null, app._container)
      },
    }

    return app
  }
}
