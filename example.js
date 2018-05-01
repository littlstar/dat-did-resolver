'use strict'

const didDAT = require('./')
const resolve = require('did-resolver')

const key = 'f0abcd6b1c4fc524e2d48da043b3d8399b96d9374d6606fca51182ee230b6b59'
//const uri = `did:dat:${key}/?network[dns][domain]=dat.local&network[dns][server]=discovery1.publicbits.org`
const uri = `did:dat:${key}`

void async function main() {

  const doc = await resolve(uri)
  const json = JSON.stringify(doc)
  console.log(json)
}()

function onerror(err) {
  console.error(err.stack || err.message || err)
}

process.on('uncaughtException', onerror)
process.on('unhandledRejection', onerror)
