# lumberman

## usage
```javascript
import lumberman from 'lumberman'
import split from 'buffer-split-transform'

const log = lumberman({
  source: child.stdout,
  transform: [ split() ],
  dispatch: [
    { when: /\[complete]/g, eventName: `complete` },
    { when: /\[warning]/g, eventName: `warning` }
  ]
})

log.on(`complete`, console.log)
log.on(`warning`, console.error)

log.pipe(fs.createReadStream(`raw_log`))
```
