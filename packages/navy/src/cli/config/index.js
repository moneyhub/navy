/* @flow */

import program from 'commander'
import {getConfig, setConfig} from '../../config'
import {NavyError} from '../../errors'
import {getLaunchedNavies} from '../../'
import {startDriverLogging, stopDriverLogging} from '../../driver-logging'

const NAME_MAP = {
  'default-navy': 'defaultNavy',
  'external-ip': 'externalIP',
}

const configWhichNeedsReconfigure = [
  'externalIP',
]

export async function reconfigureIfNecessary(configProp: string) {
  if (configWhichNeedsReconfigure.indexOf(configProp) === -1) {
    return
  }

  const navies = await getLaunchedNavies()

  for (const navy of navies) {
    startDriverLogging('Reconfiguring ' + navy.name)
    await navy.reconfigure()
    stopDriverLogging()
  }
}

program
  .command('set <key> <value>')
  .description('Sets the given config key')
  .action(async (key: string, value: string) => {
    const configProp = NAME_MAP[key]

    if (!configProp) {
      throw new NavyError('Invalid config key: ' + key)
    }

    await setConfig({
      ...(await getConfig()),
      [configProp]: value,
    })

    await reconfigureIfNecessary(configProp)
  })

program
  .command('get <key>')
  .description('Gets the given config by key')
  .action(async (key: string) => {
    if (!NAME_MAP[key]) {
      throw new NavyError('Invalid config key: ' + key)
    }

    const config = await getConfig()

    console.log(config[NAME_MAP[key]])
  })

program
  .command('rm <key>')
  .description('Removes the current config value')
  .action(async (key: string) => {
    const configProp = NAME_MAP[key]

    if (!configProp) {
      throw new NavyError('Invalid config key: ' + key)
    }

    await setConfig({
      ...(await getConfig()),
      [configProp]: null,
    })

    await reconfigureIfNecessary(configProp)
  })

program
  .command('ls')
  .description('Lists all of the Navy config keys and values that have been set')
  .action(async () => {
    const configKeys = Object.keys(NAME_MAP)
    const config = await getConfig()

    console.log(
      configKeys.map(key => `${key}=${config[NAME_MAP[key]] != null ? config[NAME_MAP[key]] : 'null'}`).join('\n')
    )
  })

program
  .command('json')
  .description('Dumps out all Navy config as JSON')
  .action(async () => {
    console.log(JSON.stringify(await getConfig(), null, 2))
  })

process.on('unhandledRejection', err => {
  if (err instanceof NavyError) {
    err.prettyPrint()
  } else {
    console.error(err.stack)
  }
})

program.parse(process.argv)

if (program.args.length === 0) {
  program.help()
}
