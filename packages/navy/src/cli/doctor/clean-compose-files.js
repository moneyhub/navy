/* @flow */

import path from 'path'
import { promises as fsp } from 'fs'

import { getLaunchedNavyNames } from '../../'
import { start } from './util'
import { pathToNavy } from '../../navy/state'
import { normaliseNavyName } from '../../navy/util'

export default async function () {
  start('Cleaning temporary Docker Compose files')

  const navyNames = await getLaunchedNavyNames()

  await Promise.all(navyNames.map(async navyName => {
    const navyPath = pathToNavy(normaliseNavyName(navyName))
    await fsp.rm(path.join(navyPath, 'docker-compose.tmp.yml'), { recursive: true, force: true })
  }))
}
