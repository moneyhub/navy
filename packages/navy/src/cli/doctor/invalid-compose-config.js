/* @flow */

import {getLaunchedNavies} from '../../'
import {start, fix, catchInvariant} from './util'

export default async function () {
  start('Checking for Navies with invalid/no compose config')

  const navies = await getLaunchedNavies()

  await Promise.all(navies.map(async navy => {
    await catchInvariant('NO_DOCKER_COMPOSE_FILE', async () => {
      await (await navy.safeGetDriver()).getConfig()
    }, async () => {
      await fix(
        'Found Navy %s which has no docker compose config, removing',
        navy.name,
        async () => {
          await navy.delete()
        },
      )
    })
  }))
}
