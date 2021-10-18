import program from 'commander'
import chalk from 'chalk'
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
  usePort: 'Setting up port mapping...',
  resetPort: 'Resetting port mapping...',
}

function removeFirstLineFromStackTrace(ex) {
  return ex.stack.split('\n').slice(1).join('\n')
}

function wrapper(res) {
  if (res.catch) {
    res.catch(ex => {
      stopDriverLogging({ success: false })

      if (ex instanceof NavyError) {
        ex.prettyPrint()
      } else if (ex.name === 'Invariant Violation') {
        console.log()
        console.log(chalk.bgRed(chalk.bold(' ' + ex.name + ' ')))
        console.log()
        console.log(' ' + ex.message.substring(ex.message.indexOf(': ') + 2))
        console.log()
        console.log(' ' + chalk.blue('Run') + ' ' + chalk.bold('navy doctor') + ' ' + chalk.blue('to attempt troubleshooting'))
        console.log()
        console.log(chalk.dim(removeFirstLineFromStackTrace(ex.stack)))
        console.log()
      } else {
        console.error(ex.stack)
      }

      process.exit(1)
    })
  }

  return res
}

function basicCliWrapper(fnName, wrapperOpts = {}) {
  const driverLogging = wrapperOpts.driverLogging == null ? true : wrapperOpts.driverLogging

  return async function (maybeServices, ...args) {
    const { getNavy } = require('../navy')

    const opts = args.length === 0 ? maybeServices : args[args.length - 1]
    const otherArgs = args.slice(0, args.length - 1)
    const envName = opts.navy

    if (wrapperOpts.serviceBasedAlias && maybeServices.length) {
      console.log(`This command should not be called with a list of services. calling '${wrapperOpts.serviceBasedAlias}' instead`)
      fnName = wrapperOpts.serviceBasedAlias
      maybeServices = maybeServices.split(' ')
    }

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
  .action(basicCliWrapper('destroy', {serviceBasedAlias: 'kill'}))
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
  .command('health')
  .option('-e, --navy [env]', `set the navy name to be used [${defaultNavy}]`, defaultNavy)
  .description('Shows the health status for all of the launched services')
  .action(lazyRequire('./health'))

program
  .command('wait-for-healthy [services...]')
  .option('-e, --navy [env]', `set the navy name to be used [${defaultNavy}]`, defaultNavy)
  .description('Waits for the given services to be healthy')
  .action(lazyRequire('./wait-for-healthy'))

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
  .command('tls [services...]')
  .option('-e, --navy [env]', `set the navy name to be used [${defaultNavy}]`, defaultNavy)
  .description('Enables services to listen on https')
  .action(lazyRequire('./tls'))
  .on('--help', () => console.log(`
   Requires config key tlsCa-dir to point to dir with ca.crt and ca.key.
  `))

program
  .command('use-port <service> <internal> <external>')
  .option('-e, --navy [env]', `set the navy name to be used [${defaultNavy}]`, defaultNavy)
  .description('Uses a specific external port for the given service and internal port')
  .action(basicCliWrapper('usePort'))

program
  .command('reset-port <service> <internal>')
  .option('-e, --navy [env]', `set the navy name to be used [${defaultNavy}]`, defaultNavy)
  .description('Resets a specific external port mapping set by use-port')
  .action(basicCliWrapper('resetPort'))

program
  .command('url <service>')
  .option('-e, --navy [env]', `set the navy name to be used [${defaultNavy}]`, defaultNavy)
  .description('Prints the external URL for the given service if it is a web service')
  .action(basicCliWrapper('url', { driverLogging: false }))
  .on('--help', () => console.log(`
  Examples:
    $ navy url mywebserver
    http://mywebserver.dev.127.0.0.1.nip.io
  `))

program
  .command('open <service>')
  .option('-e, --navy [env]', `set the navy name to be used [${defaultNavy}]`, defaultNavy)
  .description('Opens the given service in the default web browser, if the service is configured with a URL')
  .action(lazyRequire('./open'))
  .on('--help', () => console.log(`
  Examples:
    $ navy open mywebserver
    Opening mywebserver...
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
  .command('doctor')
  .description('Identifies and tries to fix some common issues which might cause Navy to stop working')
  .action(lazyRequire('./doctor'))

program
  .command('config')
  .description('Modify and get Navy global config - run `navy config` for help')
  .action(lazyRequire('./config/wrapper'))

program
  .command('external-ip')
  .description('Prints the external IP which services are accessible on')
  .action(lazyRequire('./external-ip'))

program
  .command('use-lan-ip')
  .description('Use your LAN ip address for connecting to Navy services')
  .action(lazyRequire('./lan-ip'))

program
  .command('use-local-ip')
  .description('Use your local ip address (127.0.0.1) for connecting to Navy services')
  .action(lazyRequire('./local-ip'))

export default program
