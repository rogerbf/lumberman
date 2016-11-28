# lumberman

Filter a stream data into events.

## usage
```javascript
import lumberman from 'lumberman'
import split from 'buffer-split-transform'

const log = lumberman({
  source: child.stdout,
  transform: [ split() ],
  emit: [
    { eventName: `complete`, filter: /\[complete]/g },
    { eventName: `warning`, filter: /\[warning]/g }
  ]
})

log.on(`complete`, console.log)
log.on(`warning`, console.error)

log.pipe(fs.createReadStream(`raw_log`))
```
