export function createRenderer(options) {
  // 提供虚拟节点 渲染到页面上的功能
  console.log(options)
  const render = (vnode, container) => {
    console.log(vnode, container)
  }
  return {
    render,
    // createApp(rootComponent) {
    //   return {
    //     mount(container) {},
    //   }
    // },
  }
}
