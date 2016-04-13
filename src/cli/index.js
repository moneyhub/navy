/* @flow */

import pkg from '../../package.json'
import program from './program'

const debug = require('debug')('navy:cli')

program.version(pkg.version)

program.parse(process.argv)

debug('Invoked CLI action')

if (program.args.length === 0) {
  program.help()
}
