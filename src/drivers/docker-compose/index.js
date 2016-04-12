/* @flow */

import type {Driver} from '../../driver'

export default function createDockerComposeDriver(envName: string): Driver {
  return {
    async launch(services: Array<string>): Promise<void> {
    },

    async destroy(): Promise<void> {
    },
  }
}
