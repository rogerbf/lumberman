import { Transform } from 'stream'

export default ({ source, transforms, eventBindings }) => {
  if (!source) { throw new Error(`missing source stream`) }
  if (!transforms) { transforms = [] }

  const eventCoordinator = new Transform({
    transform (chunk, encoding, next) {
      this.push(chunk)
      next()
    }
  })

  return transforms
    .reduce((stream, transformStream) => stream.pipe(transformStream), source)
    .pipe(eventCoordinator)
}
