/* @flow */

import pkg from '../../package.json'
import program from './program'
import {NavyError} from '../errors'
import {getNavy} from '../navy'

const debug = require('debug')('navy:cli')

program.version(pkg.version)

getNavy('dev').invokePluginHook('cliHook', program)
.then(() => {
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
})
.catch(err => console.error(err.stack))
