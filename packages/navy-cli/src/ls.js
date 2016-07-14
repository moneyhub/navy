import chalk from 'chalk'
import {getLaunchedNavies} from 'navy'
import {getUrlForService} from 'navy/lib/util/xipio'
import table from './util/table'
import {runCLI} from './util/helper'

const definition = `
usage: navy ls [-h] [--json]

Options:
  --json               Output as JSON instead of table
  -h, --help           Shows usage
`


export default async function (): Promise<void> {
  const args = runCLI(definition)
  const navies = await getLaunchedNavies()

  if (args['--json']) {
    return console.log(JSON.stringify(await Promise.all(navies.map(async navy => {
      const ps = await navy.ps()
      const state = await navy.getState()
      const configProvider = await navy.getConfigProvider()
      const isActive = ps.reduce((active, service) => active || service.status === 'running', false)

      return {
        name: navy.name,
        isActive,
        services: ps,
        state,
        configProvider: state.configProvider,
        configLocation: await configProvider.getLocationDisplayName(),
        url: getUrlForService('[service]', navy.normalisedName),
      }
    })), null, 2))
  }

  const rows = await Promise.all(navies.map(async navy => {
    const ps = await navy.ps()
    const state = await navy.getState()
    const configProvider = await navy.getConfigProvider()
    const isActive = ps.reduce((active, service) => active || service.status === 'running', false)

    return [
      navy.name,
      isActive ? chalk.green('yes') : chalk.red('no'),
      ps.length.toString(),
      state.configProvider,
      await configProvider.getLocationDisplayName(),
      getUrlForService(chalk.dim('service'), navy.normalisedName),
    ]
  }))

  console.log(table([
    ['NAME', 'ACTIVE', 'SERVICES', 'CONFIG PROVIDER', 'CONFIG LOCATION', 'URL'],
    ...rows,
  ]))
}
