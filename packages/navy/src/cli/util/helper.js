/* @flow */

import {run as _runCLI} from 'neodoc'
import {NavyError} from '../../errors'
import {startDriverLogging, stopDriverLogging} from '../../driver-logging'

// const loadingLabelMap = {
//   destroy: 'Destroying services...',
//   start: 'Starting services...',
//   stop: 'Stopping services...',
//   restart: 'Restarting services...',
//   kill: 'Killing services...',
//   rm: 'Removing services...',
//   update: 'Updating service images...',
//   delete: 'Deleting navy configuration...',
//   useTag: 'Pulling custom tag...',
//   resetTag: 'Resetting to default tag...',
// }

export function runCLI(doc: string, opts: Object = {}) {
  const args = _runCLI(doc, { ...opts, optionsFirst: true, smartOptions: true })

  if (args['--help'] && !opts.ignoreHelpFlag) {
    console.log(doc.trim())
    process.exit()
  }

  return args
}

export async function invokeCLI(args: Object, doc: string, commands: Object) {
  const command = args['<command>']

  if (!command || !commands[command]) {
    return console.log(doc.trim())
  }

  return await commands[command](args)
}

export async function runAndInvokeCLI(doc: string, commands: Object, opts: Object = {}) {
  const args = runCLI(doc, opts)
  return await invokeCLI({ ...(opts.parentArgs || {}), ...args }, doc, commands)
}

export async function basicCLIWrapper(fnName: string, args: Object, opts: Object = {}) {
  const { logging } = opts

  const { getNavy } = require('../../navy')

  const envName = args['--navy']
  let services = args['<SERVICE>']

  if (services && services.length === 0) services = null

  process.on('unhandledRejection', ex => {
    stopDriverLogging({ success: false })

    if (ex instanceof NavyError) {
      ex.prettyPrint()
    } else {
      console.error(ex.stack)
    }

    process.exit()
  })

  if (logging) startDriverLogging(logging)

  const navy = getNavy(envName)
  await navy.ensurePluginsLoaded()
  await navy.emitAsync(`cli.before.${fnName}`, fnName)

  const returnVal = await navy[fnName](services)

  await navy.emitAsync(`cli.after.${fnName}`, fnName)

  if (logging) stopDriverLogging()

  if (Array.isArray(returnVal)) {
    return console.log(returnVal.join('\n'))
  }

  if (returnVal != null) {
    console.log(returnVal)
  }
}
