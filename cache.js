'use strict'

const lru = require('lru-cache')

let cache = null

module.exports = {
  get cache() { return cache },
  init(opts) { cache = lru(opts) },
}

