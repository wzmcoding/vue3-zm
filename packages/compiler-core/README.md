# 编译时

## 什么是编译时？

将模板编译成 js 的过程，就是编译时

```vue
<div>111</div>
```

把上面这一坨当做一个字符串来解析，解析成 js 文件，这个过程叫做编译时：

1. 把 .vue 文件的内容当做一个字符串，转换成 ast 语法树（ast语法树只是用来描述语法的），它是一个对象
2. 把 ast 语法树，转换成我们运行时的代码 `createElementBlock`、`createElementVNode`、`createVNode`

我们把 `<div>111</div>` 转换为 ast 语法树

```js
const ast = {
  type: 1, // 对应的标记就是1
  tag: 'div',
  children: [
    {
      type: 2,
      content: '111',
    },
  ],
}

// 把上面的 ast 语法树转换成 我们的运行时的代码
const vnode = createElementBlock('div', null, ['111'])
```

https://astexplorer.net/ 可以看到 ast 语法树解析出来的结果

知道了这个概念之后，我们接下来就来完成模板编译成 ast 语法树的过程
