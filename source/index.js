import { Transform } from 'stream'

export default ({ source, transform, emit }) => {
  if (!source) { throw new Error(`missing source stream`) }
  if (!transform) { transform = [] }

  const lumberman = new Transform({
    transform (chunk, encoding, next) {
      this.push(chunk)
      next()
    },
    objectMode: source._readableState.objectMode
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

  return transform
    .reduce((stream, transformStream) => stream.pipe(transformStream), source)
    .pipe(lumberman)
}
