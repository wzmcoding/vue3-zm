export interface Link {
  // 保存当前要关联的 effect
  sub: Function
  // 链表的下一个节点
  nextSub: Link
  // 链表的上一个节点
  prevSub: Link
}

/**
 * 链接链表关系
 * @param dep
 * @param sub
 */
export function link(dep, sub) {
  // 如果 activeSub 有，那就保存起来，等我更新的时候，触发
  const newLink = {
    sub,
    nextSub: undefined,
    prevSub: undefined,
  }

  /**
   * 关联链表关系，分两种情况
   * 1. 尾节点有，那就往尾节点后面加
   * 2. 如果尾节点没有，则表示第一次关联，那就往头节点加，头尾相同
   */
  if (dep.subsTail) {
    dep.subsTail.nextSub = newLink
    newLink.prevSub = dep.subsTail
    dep.subsTail = newLink
  } else {
    dep.subs = newLink
    dep.subsTail = newLink
  }
}

/**
 * 传播更新的函数
 * @param subs
 */
export function propagate(subs) {
  let link = subs
  let queuedEffect = []
  while (link) {
    queuedEffect.push(link.sub)
    link = link.nextSub
  }

  queuedEffect.forEach(effect => effect.notify())
}
