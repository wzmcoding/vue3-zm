export const isKeepAlive = (type) => type?.__isKeepAlive

export const KeepAlive = {
  name: 'KeepAlive',
  __isKeepAlive: true,
  setup(props, { slots }) {
    return () => {
      return () => slots.default()
    }
  }
}