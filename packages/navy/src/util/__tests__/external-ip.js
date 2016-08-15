/* eslint-env mocha */

import {expect} from 'chai'
import {getExternalIP} from '../external-ip'

describe('getExternalIP', function () {

  it('should return NAVY_EXTERNAL_IP if set', async function () {
    process.env.NAVY_EXTERNAL_IP = '192.168.1.10'
    expect(await getExternalIP()).to.equal('192.168.1.10')
    delete process.env.NAVY_EXTERNAL_IP
  })

  it('should return correct extract from DOCKER_HOST if set', async function () {
    process.env.DOCKER_HOST = 'tcp://192.168.1.12:2375'
    expect(await getExternalIP()).to.equal('192.168.1.12')
    delete process.env.DOCKER_HOST
  })

  it('should resolve the hostname from DOCKER_HOST if it isn\'t an ipv4 address', async function () {
    process.env.DOCKER_HOST = 'tcp://localhost:2375'
    expect(await getExternalIP()).to.equal('127.0.0.1')

    process.env.DOCKER_HOST = 'tcp://testfoo.192.168.1.13.xip.io:2375'
    expect(await getExternalIP()).to.equal('192.168.1.13')
    delete process.env.DOCKER_HOST
  })

})
