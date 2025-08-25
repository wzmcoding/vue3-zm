import {
  setCurrentRenderingInstance,
  unsetCurrentRenderingInstance,
} from './component'

function hasPropsChanged(prevProps, nextProps) {
  const nextKeys = Object.keys(nextProps)
  if (nextKeys.length !== Object.keys(prevProps).length) {
    return true
  }

  for (const key of nextKeys) {
    if (nextKeys[key] !== prevProps[key]) {
      return true
    }
  }

  return false
}

export function shouldUpdateComponent(n1, n2) {
  const { props: prevProps, children: prevChildren } = n1
  const { props: nextProps, children: nextChildren } = n2

  /**
   * 任意一个有插槽，需要更新
   */
  if (prevChildren || nextChildren) {
    return true
  }

  if (!prevProps) {
    // 老的没有，新的有，需要更新
    // 老的没有，新的没有，不需要更新
    return !!nextProps
  }

  if (!nextProps) {
    // 老的有，新的没有，需要更新
    return true
  }

  /**
   * 老的有，新的也有，需要更新
   */
  return hasPropsChanged(prevProps, nextProps)
}

export function renderComponentRoot(instance) {
  setCurrentRenderingInstance(instance)
  const subTree = instance.render.call(instance.proxy)
  unsetCurrentRenderingInstance()
  return subTree
}
