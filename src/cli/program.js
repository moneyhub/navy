import program from 'commander'
import {NavyError} from '../errors'
import {getConfig} from '../config'
import {startDriverLogging, stopDriverLogging} from '../driver-logging'

const loadingLabelMap = {
  destroy: 'Destroying services...',
  start: 'Starting services...',
  stop: 'Stopping services...',
  restart: 'Restarting services...',
  kill: 'Killing services...',
  rm: 'Removing services...',
  pull: 'Pulling service images...',
}

function wrapper(res) {
  if (res.catch) {
    res.catch(ex => {
      stopDriverLogging({ success: false })

      if (ex instanceof NavyError) {
        ex.prettyPrint()
      } else {
        console.error(ex.stack)
      }
    })
  }

  return res
}

function basicCliWrapper(fnName, opts = {}) {
  const driverLogging = opts.driverLogging == null ? true : opts.driverLogging

  return async function (maybeServices, ...args) {
    const { getNavy } = require('../navy')

    const opts = args.length === 0 ? maybeServices : args[args.length - 1]
    const otherArgs = args.slice(0, args.length - 1)
    const envName = opts.navy

    if (driverLogging) startDriverLogging(loadingLabelMap[fnName])

    const returnVal = await wrapper(getNavy(envName)[fnName](
      Array.isArray(maybeServices) && maybeServices.length === 0
        ? undefined
        : maybeServices,
      ...otherArgs,
    ))

    if (driverLogging) stopDriverLogging()

    if (returnVal != null) {
      console.log(returnVal)
    }
  }
}

function lazyRequire(path) {
  return function (...args) {
    const mod = require(path)
    return wrapper((mod.default || mod)(...args))
  }
}

const defaultNavy = getConfig().defaultNavy

program
  .command('launch [services...]')
  .option('-e, --navy [env]', `set the navy name to be used [${defaultNavy}]`, defaultNavy)
  .description('Launches the given services in an navy')
  .action(lazyRequire('./launch'))
  .on('--help', () => console.log(`
  This will prompt you for the services that you want to bring up.
  You can optionally provide the names of services to bring up which will disable the interactive prompt.
  `))

program
  .command('destroy')
  .option('-e, --navy [env]', `set the navy name to be used [${defaultNavy}]`, defaultNavy)
  .option('-f, --force', 'don\'t prompt before removing the navy')
  .description('Destroys an navy and all related data and services')
  .action(basicCliWrapper('destroy'))
  .on('--help', () => console.log(`
  This will destroy an entire navy and all of its data and services.

  Examples:
    $ navy destroy # destroy "${defaultNavy}" navy
    $ navy destroy -e dev # destroy "dev" navy
    $ navy destroy -e test # destroy "test" navy
  `))

program
  .command('ps')
  .option('-e, --navy [env]', `set the navy name to be used [${defaultNavy}]`, defaultNavy)
  .option('--json', 'output JSON instead of a table')
  .description('Lists the running services for an navy')
  .action(lazyRequire('./ps'))

program
  .command('start [services...]')
  .option('-e, --navy [env]', `set the navy name to be used [${defaultNavy}]`, defaultNavy)
  .description('Starts the given services')
  .action(basicCliWrapper('start'))

program
  .command('stop [services...]')
  .option('-e, --navy [env]', `set the navy name to be used [${defaultNavy}]`, defaultNavy)
  .description('Stops the given services')
  .action(basicCliWrapper('stop'))

program
  .command('restart [services...]')
  .option('-e, --navy [env]', `set the navy name to be used [${defaultNavy}]`, defaultNavy)
  .description('Restarts the given services')
  .action(basicCliWrapper('restart'))

program
  .command('kill [services...]')
  .option('-e, --navy [env]', `set the navy name to be used [${defaultNavy}]`, defaultNavy)
  .description('Kills the given services')
  .action(basicCliWrapper('kill'))

program
  .command('rm [services...]')
  .option('-e, --navy [env]', `set the navy name to be used [${defaultNavy}]`, defaultNavy)
  .description('Removes the given services')
  .action(basicCliWrapper('rm'))

program
  .command('pull [services...]')
  .option('-e, --navy [env]', `set the navy name to be used [${defaultNavy}]`, defaultNavy)
  .description('Pulls the given services\' images from their respective registries')
  .action(basicCliWrapper('pull'))

program
  .command('host <service>')
  .option('-e, --navy [env]', `set the navy name to be used [${defaultNavy}]`, defaultNavy)
  .description('Prints the external host for the given service')
  .action(basicCliWrapper('host', { driverLogging: false }))
  .on('--help', () => console.log(`
  Examples:
    $ navy host mywebserver
    localhost
  `))

program
  .command('port <service> <port>')
  .option('-e, --navy [env]', `set the navy name to be used [${defaultNavy}]`, defaultNavy)
  .description('Prints the external port for the given internal port of the given service')
  .action(basicCliWrapper('port', { driverLogging: false }))
  .on('--help', () => console.log(`
  Examples:
    $ navy port mywebserver 80
    35821
  `))

program
  .command('status')
  .option('--json', 'output JSON instead of a table')
  .description('List all of the running navies and the status of their services')
  .action(lazyRequire('./status'))

program
  .command('set-default <navy>')
  .description('Set the default navy')
  .action(lazyRequire('./set-default'))

program
  .command('help')
  .alias('*')
  .action(() => program.help())

export default program
