import { Transform } from 'stream'

export default ({ source, transform, emit }) => {
  if (!source) { throw new Error(`missing source stream`) }
  if (!transform) { transform = [] }

  const objectMode = transform.length > 0
  ? transform[transform.length - 1]._readableState.objectMode
  : source._readableState.objectMode

  const lumberman = new Transform({
    transform (chunk, encoding, next) {
      this.push(chunk)
      next()
    },
    objectMode
  })

  if (emit) {
    lumberman.on(`data`, data => {
      emit.map(emit => {
        if (emit.filter.test) {
          if (emit.filter.test(data)) {
            lumberman.emit(emit.eventName, data)
          }
        } else {
          if (emit.filter(data)) {
            lumberman.emit(emit.eventName, data)
          }
        }
      })
    })
  }

  return transform.reduce(
    (stream, transformStream) => stream.pipe(transformStream), source
  ).pipe(lumberman)
}
