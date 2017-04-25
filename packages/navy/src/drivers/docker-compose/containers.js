/* @flow */

import type {Navy} from '../../navy'

export function getContainerName(navy: Navy, service: string, index: number = 1) {
  return `${navy.normalisedName}_${service}_${index}`
}
