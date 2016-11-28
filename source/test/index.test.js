import test from 'tape'
import lumberman from '../index'
import { Readable, Transform } from 'stream'

const createTestStream = (data, objectMode = false) => {
  return Object.assign(
    new Readable({
      read () {
        if (this.data.length > 0) {
          this.push(this.data.shift())
        } else {
          this.push(null)
        }
      },
      objectMode
    }),
    { data: [ ...data ] }
  )
}

const sampleData = {
  A: [
    `Nov 23 11:27:43.436 [notice] Tor v0.2.8.9 running on Darwin with Libevent 2.0.22-stable, OpenSSL 1.0.2j and Zlib 1.2.8.\n`,
    `Nov 23 11:27:43.437 [notice] Tor can't help you if you use it wrong! Learn how to be safe at https://www.torproject.org/download/download#warning\n`,
    `Nov 23 11:27:43.438 [notice] Configuration file "/usr/local/etc/tor/torrc" not present, using reasonable defaults.\n`,
    `Nov 23 11:27:43.446 [warn] Warning from libevent: kq_init: detected broken kqueue; not using.: Invalid argument\n`,
    `Nov 23 11:27:43.446 [notice] Opening Socks listener on 127.0.0.1:9050\n`
  ],
  B: [
    `newline\nseparated\nwords`,
    `with\nno\nspaces`
  ],
  C: [
    { type: `warning`, message: `something went wrong` },
    { type: `notice`, message: `connecting` },
    { type: `warning`, message: `connection failed` }
  ]
}

const capitalize = () => {
  return new Transform({
    transform (chunk, encoding, next) {
      this.push(chunk.toString().toUpperCase())
      next()
    }
  })
}

const appendDataToWarning = (data) => {
  return new Transform({
    transform (obj, encoding, next) {
      if (obj.type === `warning`) {
        this.push({ ...obj, ...data })
      } else {
        this.push(obj)
      }
      next()
    },
    objectMode: true
  })
}

const removeChar = char => {
  return new Transform({
    transform (chunk, encoding, next) {
      this.push(chunk.toString().split(char).join(``))
      next()
    }
  })
}

test(`lumberman exports a function`, assert => {
  assert.equal(typeof (lumberman), `function`)
  assert.end()
})

test(`returns a readable stream`, assert => {
  const log = lumberman({ source: createTestStream(sampleData.A) })
  assert.equal(log.constructor.name, `Transform`)
  assert.end()
})

test(`throws with no argument`, assert => {
  assert.throws(lumberman.bind(null))
  assert.end()
})

test(`throws with no source stream`, assert => {
  assert.throws(lumberman.bind(null, {}))
  assert.end()
})

test(`expected output with defaults`, assert => {
  const source = createTestStream(sampleData.B)
  const log = lumberman({ source })

  const expected = {
    eventCount: 2,
    data: [ `newline\nseparated\nwords`, `with\nno\nspaces` ]
  }

  const actual = {
    eventCount: 0,
    data: []
  }

  log.on(`data`, data => {
    actual.data = [ ...actual.data, data.toString() ]
    actual.eventCount = actual.eventCount + 1
  })

  log.on(`end`, () => {
    assert.equal(actual.eventCount, expected.eventCount)
    assert.deepEqual(actual.data, expected.data)
    assert.end()
  })
})

test(`expected output with custom transform`, assert => {
  const source = createTestStream(sampleData.B)
  const log = lumberman({ source, transform: [ removeChar(`\n`) ] })

  const expected = {
    eventCount: 2,
    data: [ `newlineseparatedwords`, `withnospaces` ]
  }

  const actual = {
    eventCount: 0,
    data: []
  }

  log.on(`data`, data => {
    actual.data = [ ...actual.data, data.toString() ]
    actual.eventCount = actual.eventCount + 1
  })

  log.on(`end`, () => {
    assert.equal(actual.eventCount, expected.eventCount)
    assert.deepEqual(actual.data, expected.data)
    assert.end()
  })
})

test(`expected output with multiple custom transforms`, assert => {
  const source = createTestStream(sampleData.B)
  const log = lumberman({
    source,
    transform: [ removeChar(`\n`), capitalize() ]
  })

  const expected = {
    eventCount: 2,
    data: [ `NEWLINESEPARATEDWORDS`, `WITHNOSPACES` ]
  }

  const actual = {
    eventCount: 0,
    data: []
  }

  log.on(`data`, data => {
    actual.data = [ ...actual.data, data.toString() ]
    actual.eventCount = actual.eventCount + 1
  })

  log.on(`end`, () => {
    assert.equal(actual.eventCount, expected.eventCount)
    assert.deepEqual(actual.data, expected.data)
    assert.end()
  })
})

test(`expected output with filters`, assert => {
  const source = createTestStream(sampleData.A)
  const log = lumberman({
    source,
    emit: [
      {
        eventName: `warn`,
        filter: /\[warn]/g
      }
    ]
  })

  const expected = {
    eventCount: 1,
    data: [ `Nov 23 11:27:43.446 [warn] Warning from libevent: kq_init: detected broken kqueue; not using.: Invalid argument\n` ]
  }

  const actual = {
    eventCount: 0,
    data: []
  }

  log.on(`warn`, data => {
    actual.data = [ ...actual.data, data.toString() ]
    actual.eventCount = actual.eventCount + 1
  })

  log.on(`end`, () => {
    assert.equal(actual.eventCount, expected.eventCount)
    assert.deepEqual(actual.data, expected.data)
    assert.end()
  })
})

test(`expected output with filters (objects)`, assert => {
  const source = createTestStream(sampleData.C, true)

  const log = lumberman({
    source,
    emit: [
      {
        eventName: `warning`,
        filter: data => data.type === `warning`
      },
      {
        eventName: `notice`,
        filter: data => data.type === `notice`
      }
    ]
  })

  assert.equal(log._readableState.objectMode, true)

  const expected = {
    warning: {
      eventCount: 2,
      data: [
        { type: `warning`, message: `something went wrong` },
        { type: `warning`, message: `connection failed` }
      ]
    },
    notice: {
      eventCount: 1,
      data: [ { type: `notice`, message: `connecting` } ]
    }
  }

  const actual = {
    warning: {
      eventCount: 0,
      data: []
    },
    notice: {
      eventCount: 0,
      data: []
    }
  }

  log.on(`warning`, data => {
    actual.warning.data = [ ...actual.warning.data, data ]
    actual.warning.eventCount = actual.warning.eventCount + 1
  })

  log.on(`notice`, data => {
    actual.notice.data = [ ...actual.notice.data, data ]
    actual.notice.eventCount = actual.notice.eventCount + 1
  })

  log.on(`end`, () => {
    assert.deepEqual(actual, expected)
    assert.end()
  })
})

test(`expected output with filters (objects) and transform`, assert => {
  const source = createTestStream(sampleData.C, true)

  const log = lumberman({
    source,
    transform: [ appendDataToWarning({ hello: `test` }) ],
    emit: [
      {
        eventName: `warning`,
        filter: data => data.type === `warning`
      },
      {
        eventName: `notice`,
        filter: data => data.type === `notice`
      }
    ]
  })

  assert.equal(log._readableState.objectMode, true)

  const expected = {
    warning: {
      eventCount: 2,
      data: [
        { type: `warning`, message: `something went wrong`, hello: `test` },
        { type: `warning`, message: `connection failed`, hello: `test` }
      ]
    },
    notice: {
      eventCount: 1,
      data: [ { type: `notice`, message: `connecting` } ]
    }
  }

  const actual = {
    warning: {
      eventCount: 0,
      data: []
    },
    notice: {
      eventCount: 0,
      data: []
    }
  }

  log.on(`warning`, data => {
    actual.warning.data = [ ...actual.warning.data, data ]
    actual.warning.eventCount = actual.warning.eventCount + 1
  })

  log.on(`notice`, data => {
    actual.notice.data = [ ...actual.notice.data, data ]
    actual.notice.eventCount = actual.notice.eventCount + 1
  })

  log.on(`end`, () => {
    assert.deepEqual(actual, expected)
    assert.end()
  })
})
