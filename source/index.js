import { Transform } from 'stream'

export default ({ source, transform, dispatch }) => {
  if (!source) { throw new Error(`missing source stream`) }
  if (!transform) { transform = [] }

  const lumberman = new Transform({
    transform (chunk, encoding, next) {
      this.push(chunk)
      next()
    },
    objectMode: source._readableState.objectMode
  })

  if (dispatch) {
    lumberman.on(`data`, data => {
      dispatch.map(dispatch => {
        if (dispatch.when.test) {
          if (dispatch.when.test(data)) {
            lumberman.emit(dispatch.eventName, data)
          }
        } else {
          if (dispatch.when(data)) {
            lumberman.emit(dispatch.eventName, data)
          }
        }
      })
    })
  }

  return transform
    .reduce((stream, transformStream) => stream.pipe(transformStream), source)
    .pipe(lumberman)
}
