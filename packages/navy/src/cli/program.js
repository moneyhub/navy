import program from 'commander'
import {NavyError} from '../errors'
import {getConfig} from '../config'
import {startDriverLogging, stopDriverLogging} from '../driver-logging'
import {getImportCommandLineOptions} from '../config-provider'

const loadingLabelMap = {
  destroy: 'Destroying services...',
  start: 'Starting services...',
  stop: 'Stopping services...',
  restart: 'Restarting services...',
  kill: 'Killing services...',
  rm: 'Removing services...',
  update: 'Updating service images...',
  delete: 'Deleting navy configuration...',
  useTag: 'Pulling custom tag...',
  resetTag: 'Resetting to default tag...',
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

    process.on('unhandledRejection', ex => {
      stopDriverLogging({ success: false })

      if (ex instanceof NavyError) {
        ex.prettyPrint()
      } else {
        console.error(ex.stack)
      }

      process.exit()
    })

    if (driverLogging) startDriverLogging(loadingLabelMap[fnName])

    const navy = getNavy(envName)
    await navy.ensurePluginsLoaded()
    await navy.emitAsync(`cli.before.${fnName}`, fnName)

    const returnVal = await navy[fnName](
      Array.isArray(maybeServices) && maybeServices.length === 0
        ? undefined
        : maybeServices,
      ...otherArgs,
    )

    await navy.emitAsync(`cli.after.${fnName}`, fnName)

    if (driverLogging) stopDriverLogging()

    if (Array.isArray(returnVal)) {
      return console.log(returnVal.join('\n'))
    }

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

const defaultNavy = process.env.NAVY_NAME || getConfig().defaultNavy

const importCommand = program
  .command('import')
  .option('-e, --navy [env]', `set the navy name to be used [${defaultNavy}]`, defaultNavy)
  .description('Imports docker compose configuration from the current working directory and initialises a new navy')
  .action(lazyRequire('./import'))

getImportCommandLineOptions().forEach(opt => importCommand.option(...opt))

program
  .command('launch [services...]')
  .option('-e, --navy [env]', `set the navy name to be used [${defaultNavy}]`, defaultNavy)
  .description('Launches the given services in a navy')
  .action(lazyRequire('./launch'))
  .on('--help', () => console.log(`
  This will prompt you for the services that you want to bring up.
  You can optionally provide the names of services to bring up which will disable the interactive prompt.
  `))

program
  .command('destroy')
  .option('-e, --navy [env]', `set the navy name to be used [${defaultNavy}]`, defaultNavy)
  .description('Destroys a navy and all related data and services')
  .action(basicCliWrapper('destroy'))
  .on('--help', () => console.log(`
  This will destroy an entire navy and all of its data and services.

  Examples:
    $ navy destroy # destroy "${defaultNavy}" navy
    $ navy destroy -e dev # destroy "dev" navy
    $ navy destroy -e test # destroy "test" navy
  `))

program
  .command('delete')
  .option('-e, --navy [env]', `set the navy name to be used [${defaultNavy}]`, defaultNavy)
  .description('Removes a navy configuration without removing any docker containers or services')
  .action(basicCliWrapper('delete'))

program
  .command('ps')
  .option('-e, --navy [env]', `set the navy name to be used [${defaultNavy}]`, defaultNavy)
  .option('--json', 'output JSON instead of a table')
  .description('Lists the running services for a navy')
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
  .command('update [services...]')
  .option('-e, --navy [env]', `set the navy name to be used [${defaultNavy}]`, defaultNavy)
  .description('Pulls the given services\' images from their respective registries and relaunches the services')
  .action(basicCliWrapper('update'))

program
  .command('updates')
  .option('-e, --navy [env]', `set the navy name to be used [${defaultNavy}]`, defaultNavy)
  .description('Checks for updates for all the launched services')
  .action(lazyRequire('./updates'))

program
  .command('logs [services...]')
  .option('-e, --navy [env]', `set the navy name to be used [${defaultNavy}]`, defaultNavy)
  .description('Streams logs for the given services')
  .action(lazyRequire('./logs'))

program
  .command('use-tag <service> <tag>')
  .option('-e, --navy [env]', `set the navy name to be used [${defaultNavy}]`, defaultNavy)
  .description('Uses a specific tag for the given service')
  .action(basicCliWrapper('useTag'))

program
  .command('reset-tag <service>')
  .option('-e, --navy [env]', `set the navy name to be used [${defaultNavy}]`, defaultNavy)
  .description('Resets any tag override on the given service')
  .action(basicCliWrapper('resetTag'))

program
  .command('url <service>')
  .option('-e, --navy [env]', `set the navy name to be used [${defaultNavy}]`, defaultNavy)
  .description('Prints the external URL for the given service if it is a web service')
  .action(basicCliWrapper('url', { driverLogging: false }))
  .on('--help', () => console.log(`
  Examples:
    $ navy url mywebserver
    http://mywebserver.dev.0.xip.io
  `))

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
  .command('available-services')
  .option('-e, --navy [env]', `set the navy name to be used [${defaultNavy}]`, defaultNavy)
  .description('Prints the names of the services that are launched or can be launched')
  .action(basicCliWrapper('getAvailableServiceNames', { driverLogging: false }))

program
  .command('develop [service]')
  .option('-e, --navy [env]', `set the navy name to be used [${defaultNavy}]`, defaultNavy)
  .option('-n, --no-logs')
  .description('Puts the given service into development using the current working directory')
  .action(lazyRequire('./develop'))

program
  .command('live [service]')
  .option('-e, --navy [env]', `set the navy name to be used [${defaultNavy}]`, defaultNavy)
  .description('Takes the given service out of development')
  .action(lazyRequire('./live'))

program
  .command('run <name> [args...]')
  .option('-e, --navy [env]', `set the navy name to be used [${defaultNavy}]`, defaultNavy)
  .description('Runs a named command specific to the given Navy')
  .action(lazyRequire('./run'))

program
  .command('refresh-config')
  .option('-e, --navy [env]', `set the navy name to be used [${defaultNavy}]`, defaultNavy)
  .description('Refreshes the configuration for the given Navy')
  .action(lazyRequire('./refresh-config'))

program
  .command('status')
  .option('--json', 'output JSON instead of a table')
  .description('List all of the imported navies')
  .action(lazyRequire('./status'))

program
  .command('set-default <navy>')
  .description('Set the default navy')
  .action(lazyRequire('./set-default'))

export default program
