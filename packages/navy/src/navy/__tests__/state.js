/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import path from 'path'
import { promises as fsp } from 'fs'
import fs from '../../util/fs'
import {
  pathToNavyRoot,
  pathToNavys,
  pathToNavy,
  pathToState,
  getState,
  saveState,
  deleteState,
} from '../state'

describe('navy/state', function () {

  let sandbox
  let originalHome

  beforeEach(function () {
    sandbox = sinon.createSandbox()
    originalHome = process.env.HOME
    process.env.HOME = '/home/test'
  })

  afterEach(function () {
    sandbox.restore()
    if (originalHome === undefined) {
      delete process.env.HOME
    } else {
      process.env.HOME = originalHome
    }
  })

  describe('pathToNavyRoot', function () {

    it('should return $HOME/.navy', function () {
      expect(pathToNavyRoot()).to.equal(path.join('/home/test', '.navy'))
    })

    it('should throw when HOME is not set', function () {
      delete process.env.HOME
      expect(() => pathToNavyRoot()).to.throw(/NO_HOME_DIRECTORY/)
    })

  })

  describe('pathToNavys', function () {

    it('should return $HOME/.navy/navies', function () {
      expect(pathToNavys()).to.equal(path.join('/home/test', '.navy', 'navies'))
    })

  })

  describe('pathToNavy', function () {

    it('should return $HOME/.navy/navies/<env>', function () {
      expect(pathToNavy('myenv')).to.equal(path.join('/home/test', '.navy', 'navies', 'myenv'))
    })

  })

  describe('pathToState', function () {

    it('should return $HOME/.navy/navies/<env>/state.json', function () {
      expect(pathToState('myenv')).to.equal(
        path.join('/home/test', '.navy', 'navies', 'myenv', 'state.json')
      )
    })

  })

  describe('getState', function () {

    it('should read and parse the state.json file', async function () {
      const state = { driver: 'docker-compose', services: { api: {} } }
      const buf = Buffer.from(JSON.stringify(state))
      sandbox.stub(fs, 'readFileAsync').resolves(buf)

      expect(await getState('myenv')).to.eql(state)
    })

    it('should return null when the state file cannot be read', async function () {
      sandbox.stub(fs, 'readFileAsync').rejects(new Error('ENOENT'))

      expect(await getState('myenv')).to.equal(null)
    })

    it('should return null when the state file content is not valid JSON', async function () {
      sandbox.stub(fs, 'readFileAsync').resolves(Buffer.from('not json'))

      expect(await getState('myenv')).to.equal(null)
    })

  })

  describe('saveState', function () {

    it('should mkdir -p the navy directory and write the state JSON file', async function () {
      const mkdirStub = sandbox.stub(fsp, 'mkdir').resolves()
      const writeStub = sandbox.stub(fs, 'writeFileAsync').resolves()

      const state = { driver: 'docker-compose' }
      await saveState('myenv', state)

      expect(mkdirStub.calledOnce).to.equal(true)
      expect(mkdirStub.firstCall.args[0]).to.equal(
        path.join('/home/test', '.navy', 'navies', 'myenv')
      )
      expect(mkdirStub.firstCall.args[1]).to.eql({ recursive: true })

      expect(writeStub.calledOnce).to.equal(true)
      expect(writeStub.firstCall.args[0]).to.equal(
        path.join('/home/test', '.navy', 'navies', 'myenv', 'state.json')
      )
      expect(JSON.parse(writeStub.firstCall.args[1])).to.eql(state)
    })

  })

  describe('deleteState', function () {

    it('should rm -rf the navy directory recursively', async function () {
      const rmStub = sandbox.stub(fsp, 'rm').resolves()

      await deleteState('myenv')

      expect(rmStub.calledOnce).to.equal(true)
      expect(rmStub.firstCall.args[0]).to.equal(
        path.join('/home/test', '.navy', 'navies', 'myenv')
      )
      expect(rmStub.firstCall.args[1]).to.eql({ recursive: true, force: true })
    })

  })

})
