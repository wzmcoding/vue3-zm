export enum State {
  /** 普通文本状态，处理标签和插值表达式之外的内容 */
  Text = 1,

  /** 插值表达式相关状态 */
  InterpolationOpen, // 开始解析插值表达式 {{
  Interpolation, // 解析插值表达式内容
  InterpolationClose, // 结束解析插值表达式 }}

  /** HTML标签相关状态 */
  BeforeTagName, // 遇到<后的状态，准备解析标签名
  InTagName, // 正在解析标签名
  InSelfClosingTag, // 处理自闭合标签 />
  BeforeClosingTagName, // 处理结束标签的开始 </
  InClosingTagName, // 解析结束标签的标签名
  AfterClosingTagName, // 结束标签名后的状态

  /** 属性和指令相关状态 */
  BeforeAttrName, // 准备解析属性名
  InAttrName, // 解析普通属性名
  InDirName, // 解析指令名（v-if, v-for等）
  InDirArg, // 解析指令参数（v-bind:arg）
  InDirDynamicArg, // 解析动态指令参数（v-bind:[arg]）
  InDirModifier, // 解析指令修饰符（v-on:click.prevent）
  AfterAttrName, // 属性名后的状态
  BeforeAttrValue, // 准备解析属性值
  InAttrValueDq, // 双引号属性值 "value"
  InAttrValueSq, // 单引号属性值 'value'
  InAttrValueNq, // 无引号属性值 value

  /** 声明相关状态 */
  BeforeDeclaration, // <!开始的声明
  InDeclaration, // 解析声明内容

  /** 处理指令相关状态 */
  InProcessingInstruction, // 处理XML处理指令 <?xml ?>

  /** 注释和CDATA相关状态 */
  BeforeComment, // 准备解析注释
  CDATASequence, // 解析CDATA序列
  InSpecialComment, // 特殊注释处理
  InCommentLike, // 类注释内容处理

  /** 特殊标签处理状态 */
  BeforeSpecialS, // 处理<script>或<style>
  BeforeSpecialT, // 处理<title>或<textarea>
  SpecialStartSequence, // 特殊标签的开始序列
  InRCDATA, // 处理RCDATA内容（script/style/textarea等）

  /** 实体解析状态 */
  InEntity, // 解析HTML实体（如&amp;）

  /** SFC相关状态 */
  InSFCRootTagName, // 解析单文件组件根标签名
}

function isTagStart(str) {
  return /[a-zA-Z]/.test(str)
}

/**
 * 解析器
 * 基于状态机实现的
 */
export class Tokenizer {
  /**
   * 状态机就是我在不同的状态下，要做的事情是不同的
   * 状态机的状态
   * 比如：
   * State.Text => 表示当前正在解析文本内容
   * State.InTagName => 表示当前正在解析标签名
   */
  state = State.Text
  /**
   * 当前正在解析的字符的下标
   * hello<div></div>world
   */
  index = 0

  /**
   * 解析开始的位置
   * 当前状态切换时候的初始位置
   */
  sectionStart = 0

  /**
   * 用来保存当前正在解析的字符串
   */
  buffer = ''

  constructor(public cbs) {}

  parse(input) {
    this.buffer = input

    while (this.index < this.buffer.length) {
      const str = this.buffer[this.index]

      /**
       * 状态机
       */
      switch (this.state) {
        case State.Text: {
          // 表示正在解析文本
          this.stateText(str)
          break
        }
        case State.BeforeTagName: {
          // 解析标签名之前
          this.stateBeforeTagName(str)
          break
        }
        case State.InTagName: {
          // 解析标签名
          this.stateInTagName(str)
          break
        }
        case State.BeforeAttrName: {
          // 准备解析属性名
          this.stateBeforeAttrName(str)
          break
        }
        case State.InClosingTagName: {
          // 解析结束标签的标签名
          this.stateInClosingTagName(str)
          break
        }
      }
      this.index++
    }

    this.cleanup()
  }

  stateInClosingTagName(str) {
    // <div></div>
    if (str === '>') {
      this.cbs.onclosetag(this.sectionStart, this.index)
      // 要从下一个开始解析文本节点不能包含 >
      this.sectionStart = this.index + 1
      this.state = State.Text
    }
  }

  stateBeforeAttrName(str) {
    if (str === '>') {
      // 表示开始标签解析完了
      this.cbs.onopentagend()
      // 要从下一个开始解析文本节点不能包含 >
      this.sectionStart = this.index + 1
      // 继续解析文本 <div>hello world</div>
      this.state = State.Text
    }
  }

  stateInTagName(str) {
    // <div id="123"></div>
    if (str === '>' || str === ' ') {
      // 标签名完事儿了
      this.cbs.onopentagname(this.sectionStart, this.index)
      // 开始解析属性了
      this.state = State.BeforeAttrName
      this.sectionStart = this.index
      this.stateBeforeAttrName(str)
    }
  }
  stateBeforeTagName(str) {
    // <div></div>
    if (isTagStart(str)) {
      // 开始标签
      this.state = State.InTagName
      this.sectionStart = this.index
    } else if (str === '/') {
      this.state = State.InClosingTagName
      // <div></div>，当前正在匹配的字符串是 / 要 +1 从下一个开始
      this.sectionStart = this.index + 1
    } else {
      // 老六乱写的，不是标签
      this.state = State.Text
    }
  }
  stateText(str) {
    if (str === '<') {
      // 证明我要开始解析标签了
      if (this.sectionStart < this.index) {
        // 处理之前的文本内容
        this.cbs.ontext(this.sectionStart, this.index)
      }
      // 切换状态
      this.state = State.BeforeTagName
      // 移动开始位置
      this.sectionStart = this.index
    }
  }

  cleanup() {
    if (this.sectionStart < this.index) {
      // hello world 处理完了 this.sectionStart = 0, this.index = 11
      // 证明还有我没有处理的
      if (this.state === State.Text) {
        // 要处理的是文本节点
        // 把开始的位置和结束的位置传过去
        this.cbs.ontext(this.sectionStart, this.index)
        // 处理完了，移动 sectionStart 的位置
        this.sectionStart = this.index
      }
    }
  }
  /**
   * 返回指定 index 的位置
   */
  getPos(index) {
    // hello world
    return {
      column: index + 1, // 表示在第几列
      line: 1, // TODO 暂时不考虑换行
      offset: index, // 偏移量
    }
  }
}
