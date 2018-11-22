/* @flow */

import yaml from 'js-yaml'

import fs from '../../util/fs'
import docker from '../../util/docker-client'
import {createComposeClient} from './client'
import {Status as ServiceStatus} from '../../service'

import type {Driver} from '../../driver'
import type {ServiceList} from '../../service'
import type {Navy} from '../../navy'

const debug = require('debug')('navy:docker-compose')

function getArgsFromOptions(opts: Object, argMap: Object): Array<string> {
  return Object.keys(opts)
    .map(key => argMap[key])
    .filter(arg => arg)
}

const launchArgMap = {
  noDeps: '--no-deps',
  forceRecreate: '--force-recreate',
}

export default function createDockerComposeDriver(navy: Navy): Driver {
  const {
    exec,
    getCompiledDockerComposePath,
  } = createComposeClient(navy)

  const driver = {
    async launch(services: Array<string>, opts: ?Object = {}): Promise<void> {
      const additionalArgs = []

      debug('Got launch', services, opts)

      if (opts) {
        additionalArgs.push(...getArgsFromOptions(opts, launchArgMap))
        debug('Resolve opts to args', additionalArgs)
      }

      if (!services) {
        services = []
      }

      await exec('up', ['-d', ...additionalArgs, ...services])
    },

    async destroy(): Promise<void> {
      await exec('kill')
      await exec('down', ['-v'])
    },

    async ps(service: ?string): Promise<ServiceList> {
      const projectName = navy.normalisedName

      const psOptions = {
        all: true,
        filters: {
          label: [
            `com.docker.compose.project=${projectName}`,
          ],
        },
      }
      if (service) {
        psOptions.filters.label.push(
          `com.docker.compose.service=${service}`
        )
      }

      const ps = await docker.listContainers(psOptions)

      const inspect = await Promise.all(ps.map(container =>
        docker.getContainer(container.Id).inspect()
      ))

      return inspect.map(service => ({
        id: service.Id,
        name: service.Config.Labels['com.docker.compose.service'],
        image: service.Config.Image,
        status: service.State.Running === true ? ServiceStatus.RUNNING : ServiceStatus.EXITED,
        raw: service,
      }))
    },

    async start(services: ?Array<string>): Promise<void> {
      await exec('start', services)
    },

    async stop(services: ?Array<string>): Promise<void> {
      await exec('stop', services)
    },

    async restart(services: ?Array<string>): Promise<void> {
      await exec('restart', services)
    },

    async kill(services: ?Array<string>): Promise<void> {
      await exec('kill', services)
    },

    async rm(services: ?Array<string>): Promise<void> {
      if (!services) {
        services = []
      }

      await exec('rm', ['-f', '-v', ...services])
    },

    async update(services: ?Array<string>): Promise<void> {
      if (!services) {
        services = []
      }

      await exec('pull', services)

      // only relaunch services which are already running
      const launchedServiceNames = toLookupTable(await this.getLaunchedServiceNames())
      const servicesToRelaunch = services.filter((name) => launchedServiceNames[name])

      if (servicesToRelaunch.length) {
        await exec('up', ['-d', '--no-deps', ...servicesToRelaunch])
      }
    },

    async spawnLogStream(services: ?Array<string>): Promise<void> {
      if (!services) {
        services = []
      }

      await exec('logs', ['-f', '--tail=250', ...services], { pipeLog: true, maxBuffer: Infinity })
    },

    async port(service: string, privatePort: number, index: ?number): Promise<?number> {
      if (index == null) index = 1

      const container = (await this.ps(service)).pop()
      if (!container) {
        return null
      }

      const portConfig = container.raw.NetworkSettings.Ports[`${privatePort}/tcp`]

      if (!Array.isArray(portConfig) || portConfig.length === 0) {
        return null
      }

      return Number(portConfig[0].HostPort)
    },

    async writeConfig(config: Object): Promise<void> {
      const yamlOut = yaml.safeDump(config, {skipInvalid: true})
      await fs.writeFileAsync(getCompiledDockerComposePath(), yamlOut)

      debug('Wrote docker-compose.tmp.yml', yamlOut)
    },

    async getConfig(): Promise<Object> {
      const output = await exec('config', [], { useOriginalDockerComposeFiles: true, noLog: true })
      const config = yaml.safeLoad(output)

      return config
    },

    async getLaunchedServiceNames(): Promise<Array<string>> {
      const projectName = navy.normalisedName

      const ps = await docker.listContainers({
        all: true,
        filters: {
          label: [
            `com.docker.compose.project=${projectName}`,
          ],
        },
      })

      const names = ps.map(container => container.Labels['com.docker.compose.service'])

      return names
    },

    async getAvailableServiceNames(): Promise<Array<string>> {
      const config = await driver.getConfig()

      return Object.keys(config.services)
    },
  }

  return driver
}

function toLookupTable(keys: Array<string>): Object {
  const lookupTable = {}
  keys.forEach((key) => lookupTable[key] = true)
  return lookupTable
}
