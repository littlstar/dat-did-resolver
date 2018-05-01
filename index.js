'use strict'

const { register } = require('./register')
const { resolve } = require('./resolve')

void register() // !

module.exports = {
  register,
  resolve
}
