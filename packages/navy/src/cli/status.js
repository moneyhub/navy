import chalk from 'chalk'
import {getLaunchedNavies} from '../'
import table from '../util/table'
import {getConfig} from '../config'

function formatNavyName(navy, defaultNavy) {
  if (navy.name === defaultNavy) {
    return `${navy.name} ${chalk.cyan('(default)')}`
  }

  return navy.name
}

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
        url: await navy.url('[service]'),
      }
    })), null, 2))
  }

  const config = await getConfig()

  const { defaultNavy } = config

  const rows = await Promise.all(navies.map(async navy => {
    const ps = await navy.ps()
    const state = await navy.getState()
    const configProvider = await navy.getConfigProvider()
    const isActive = ps.reduce((active, service) => active || service.status === 'running', false)

    return [
      formatNavyName(navy, defaultNavy),
      isActive ? chalk.green('yes') : chalk.red('no'),
      ps.length.toString(),
      state.configProvider,
      await configProvider.getLocationDisplayName(),
      await navy.url(chalk.dim('service')),
    ]
  }))

  console.log(table([
    ['NAME', 'ACTIVE', 'SERVICES', 'CONFIG PROVIDER', 'CONFIG LOCATION', 'URL'],
    ...rows,
  ]))
}
