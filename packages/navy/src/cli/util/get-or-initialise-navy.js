/* @flow */

import { getNavy } from '../../'
import { importNavy } from './import'
import fileSystemConfigProvider from '../../config-providers/filesystem'

import type { Navy } from '../../navy'

export async function getOrInitialiseNavy(navyName: string): Promise<Navy> {
  const navy = getNavy(navyName)

  if (!await navy.isInitialised()) {
    await importNavy(navy, await fileSystemConfigProvider.getImportOptionsForCLI({}))
  }

  return navy
}
