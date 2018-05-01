'use strict'

const { DIDDocument } = require('did-document')
const coalesce = require('defined')
const { DID } = require('did-uri')
const debug = require('debug')('dat-did-resolver')
const pify = require('pify')
const lru = require('./cache')
const Dat = require('dat-node')
const ram = require('random-access-memory')

const {
  kEd25519SignatureAuthentication2018,
  kEd25519VerificationKey2018,
} = require('ld-cryptosuite-registry')

const kStatsUpdateTimeout = 1000
const kStatsUpdateQuota = 5

async function resolve(uri, opts) {

  if (!uri || 'string' != typeof uri) {
    throw new TypeError("resolve: Expecting uri to be a string.")
  }

  if (!opts || 'object' != typeof opts) {
    opts = {}
  }

  const timeout = coalesce(opts.timeoout, kStatsUpdateTimeout)
  const quota = coalesce(opts.quota, kStatsUpdateQuota)
  const did = new DID(uri)

  if ('dat' != did.method) {
    throw new TypeError(`resolve: Unknown method DID ${did.method}.`)
  }

  if (!did.identifier || 64 != did.identifier.length) {
    throw new TypeError(`resolve: Invalid DID identifier (dat key).`)
  }

  debug("resolve: %s:", uri, did)

  if (null == lru.cache) {
    lru.init()
  }

  if (lru.cache.has(String(did))) {
    return lru.get(String(did))
  }

  const doc = new DIDDocument({id: did}, opts.base)
  const dat = await pify(Dat)(storage(did), options(did))
  const stats = dat.trackStats()
  const { archive } = dat

  await pify(poll)()

  if ('/' == did.path) {
    const stat = stats.get()
    if (0 == stat.files && 0 == stat.length) {
      throw new TypeError("resolve: Unknown DID identifier (dat key).")
    }
  } else {
    try { await access(did.path) }
    catch (err) {
      throw new TypeError("resolve: Unknown path in DID identifier (dat key).")
    }
  }

  doc.addPublicKey({
    id: `${did.did}#owner`,
    owner: did.did,
    type: kEd25519VerificationKey2018,
    publicKeyHex: did.identifier,
  })

  doc.addAuthentication({
    type: kEd25519SignatureAuthentication2018,
    publicKey: `${did.did}#owner`,
  })

  close()

  lru.cache.set(String(did), doc)
  return doc


  function stat(pathspec) {
    return pify(archive.stat.bind(archive))(pathspec)
  }

  function access(pathspec) {
    return pify(archive.access.bind(archive))(pathspec)
  }

  function close() {
    return pify(dat.close.bind(dat))()
  }

  async function poll(done) {
    debug("network: poll")
    let updates = 0

    await join()
    wait()

    function wait() {
      debug("network: poll: wait: quota=%s updates=%s", quota, updates)
      const timer = setTimeout(ontimeout, timeout)
      stats.once('update', () => clearTimeout(timer))
      stats.once('update', () => {
        const stat = stats.get()
        debug("network: poll: wait: stats: update:", stat)
        if (++updates < quota && (0 == stat.files || 0 == stat.length)) {
          wait()
        } else {
          leave()
        }
      })
    }

    function ontimeout() {
      debug("network: poll: timeout: quota=%s updates=%s", quota, updates)
      leave()
    }

    function join() {
      debug("network: join: %s:", did.identifier, uri)
      return pify(dat.joinNetwork.bind(dat))(network(did))
    }

    function leave() {
      debug("network: leave: %s:", did.identifier, uri)
      done()
    }
  }
}

function storage(did) {
  const { storage } = did.queryParameters
  return storage || ram
}

function options(did) {
  const { identifier } = did
  return { key: identifier, sparse: true }
}

function network(did) {
  const { network } = did.queryParameters
  if (null == network || 'object' != typeof network) {
    return {}
  } else {
    bool('dns')
    bool('dht')
    bool('upload')
    bool('download')
    bool('utp')
    bool('tcp')
    return network
  }

  function bool(key) {
    if (String(true) == network[key]) { network[key] = true }
    if (String(false) == network[key]) { network[key] = false }
  }
}

module.exports = {
  resolve
}
