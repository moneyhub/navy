import chalk from 'chalk'
import {getLaunchedNavies} from '../'
import {getUrlForService} from '../util/xipio'
import table from '../util/table'

export default async function (opts: Object): Promise<void> {
  const navies = await getLaunchedNavies()

  if (opts.json) {
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
        url: await getUrlForService('[service]', navy.normalisedName),
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
      await getUrlForService(chalk.dim('service'), navy.normalisedName),
    ]
  }))

  console.log(table([
    ['NAME', 'ACTIVE', 'SERVICES', 'CONFIG PROVIDER', 'CONFIG LOCATION', 'URL'],
    ...rows,
  ]))
}
