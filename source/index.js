import { Transform } from 'stream'

export default ({ source, transforms, filters }) => {
  if (!source) { throw new Error(`missing source stream`) }
  if (!transforms) { transforms = [] }

  const lumberman = new Transform({
    transform (chunk, encoding, next) {
      this.push(chunk)
      next()
    },
    objectMode: source._readableState.objectMode
  })

  if (filters) {
    lumberman.on(`data`, data => {
      filters.map(filter => {
        if (filter.test.test) {
          if (filter.test.test(data)) {
            lumberman.emit(filter.eventName, data)
          }
        } else {
          if (filter.test(data)) {
            lumberman.emit(filter.eventName, data)
          }
        }
      })
    })
  }

  return transforms
    .reduce((stream, transformStream) => stream.pipe(transformStream), source)
    .pipe(lumberman)
}
