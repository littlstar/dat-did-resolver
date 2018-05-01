const { registerMethod } = require('did-resolver')
const { resolve } = require('./resolve')

module.exports = Object.assign(register, { register })
function register() {
  registerMethod('dat', resolve)
}
