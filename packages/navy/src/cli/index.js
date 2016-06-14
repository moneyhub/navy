/* @flow */

import pkg from '../../package.json'
import program from './program'
import {NavyError} from '../errors'

const debug = require('debug')('navy:cli')

program.version(pkg.version)

program
  .command('help')
  .alias('*')
  .action(() => program.help())

try {
  program.parse(process.argv)
} catch (ex) {
  if (ex instanceof NavyError) {
    ex.prettyPrint()
  } else {
    throw ex
  }
}

debug('Invoked CLI action')

if (program.args.length === 0) {
  program.help()
}
