import { NodeTypes } from './ast'
import { Tokenizer } from './tokenizer'

let currentInput = ''
let currentRoot

function getSlice(start, end) {
  return currentInput.slice(start, end)
}

function getLoc(start, end) {
  return {
    start: tokenizer.getPos(start), // 开始的位置信息
    end: tokenizer.getPos(end), // 结束的位置信息
    source: getSlice(start, end), // 内容
  }
}

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

const tokenizer = new Tokenizer({
  ontext(start, end) {
    const content = getSlice(start, end)

    const textNode = {
      content,
      type: NodeTypes.TEXT,
      loc: getLoc(start, end),
    }
    currentRoot.children.push(textNode)
  },
})

export function parse(input) {
  // 把当前正在解析的字符串暴漏给外部作用域
  currentInput = input
  const root = createRoot(input)
  // 把当前创建的根节点暴漏给外部作用域
  currentRoot = root
  /**
   * 开始解析 input
   * 帮我们解析
   */
  tokenizer.parse(input)

  return root
}
