/* eslint-env mocha */

import { expect } from 'chai'
import { resolveDriverFromName } from '../driver'
import DockerCompose from '../drivers/docker-compose'

describe('driver', function () {

  describe('resolveDriverFromName', function () {

    it('should return the docker-compose driver factory when given "docker-compose"', function () {
      expect(resolveDriverFromName('docker-compose')).to.equal(DockerCompose)
    })

    it('should return null for an unknown driver name', function () {
      expect(resolveDriverFromName('podman')).to.equal(null)
      expect(resolveDriverFromName('')).to.equal(null)
    })

  })

})
