/* @flow */

import {getLaunchedNavies} from '../../'
import {start, fix} from './util'

export default async function () {
  start('Checking for dangling Navies')

  const navies = await getLaunchedNavies()

  await Promise.all(navies.map(async navy => {
    const configProvider = await navy.getConfigProvider()

    if (!configProvider) {
      await fix(
        !configProvider,
        'Found Navy without config provider %s, removing',
        navy.name,
        async () => {
          await navy.destroy()
        },
      )

      return
    }

    await fix(
      await configProvider.isDangling(),
      'Found dangling Navy %s (invalid config), removing',
      navy.name,
      async () => {
        await navy.destroy()
      },
    )
  }))
}
