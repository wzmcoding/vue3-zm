import { NodeTypes } from './ast'
import { Tokenizer } from './tokenizer'

let currentInput = ''
let currentRoot
let currentOpenTag
let currentProps

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

// 栈，保存当前已打开未闭合的标签，解析到子节点的时候，会往里面塞
const stack = []

function addNode(node) {
  // ;(stack.at(-1) || currentRoot).children.push(node)
  const lastNode = stack.at(-1)
  // 找到栈的最后一个
  if (lastNode) {
    // 如果有，往children里面加
    lastNode.children.push(node)
  } else {
    // 如果没有，加入到根节点里面去
    currentRoot.children.push(node)
  }
}

function setLocEnd(loc, end) {
  loc.source = getSlice(loc.start.offset, end)
  loc.end = tokenizer.getPos(end)
}

const tokenizer = new Tokenizer({
  ontext(start, end) {
    const content = getSlice(start, end)

    const textNode = {
      content,
      type: NodeTypes.TEXT,
      loc: getLoc(start, end),
    }
    addNode(textNode)
  },
  /**
   * 标签名解析完了
   * @param start
   * @param end
   */
  onopentagname(start, end) {
    // <div></div>
    const tag = getSlice(start, end)
    // 把currentOpenTag 的作用于提升到外部，为了方便解析属性节点的时候，拿到它
    currentOpenTag = {
      type: NodeTypes.ELEMENT,
      tag,
      children: [],
      loc: getLoc(start - 1, end),
    }
  },
  onopentagend() {
    addNode(currentOpenTag)
    stack.push(currentOpenTag)
    currentOpenTag = null
  },
  onclosetag(start, end) {
    // 闭合
    const name = getSlice(start, end)
    const lastNode = stack.pop()
    if (lastNode.tag === name) {
      setLocEnd(lastNode.loc, end + 1)
    } else {
      // 标签写错了
      console.log('有个老六写错了')
    }
  },
  onattrname(start, end) {
    currentProps = {
      // 属性名 id
      name: getSlice(start, end),
      // 位置信息，位置信息也不准确，还没解析完属性值
      loc: getLoc(start, end),
      // 还没解析到属性值，先设置成 undefined
      value: undefined,
    }
  },
  onattrvalue(start, end) {
    currentProps.value = getSlice(start, end)
    setLocEnd(currentProps.loc, end + 1)
    if (currentOpenTag) {
      // 如果当前标签存在，那就把属性放进去
      if (!currentOpenTag.props) {
        // 第一次没有 props ，给它设置为 空数组
        currentOpenTag.props = []
      }
      // 把属性放进去
      currentOpenTag.props.push(currentProps)
    }
    // 置空
    currentProps = null
  },
})

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
