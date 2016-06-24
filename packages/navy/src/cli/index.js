/* @flow */

import program from './program'
import pkg from '../../package.json'
import {NavyError} from '../errors'

const debug = require('debug')('navy:cli')

debug('Loaded CLI')

program.version(pkg.version)

program
  .command('help')
  .alias('*')
  .action(() => program.help())

debug('Parsing and running command')

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
