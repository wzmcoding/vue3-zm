import { NodeTypes } from './ast'

/**
 * 创建ast语法树的根节点
 * @param source
 */
function createRoot(source) {
  return {
    // 根节点是0
    type: NodeTypes.ROOT,
    // 子节点
    children: [],
    // 初始化的字符串
    source,
  }
}

export function parse(input) {
  console.log('parse', input)
}
