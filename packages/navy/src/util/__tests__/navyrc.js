/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import path from 'path'
import fs from '../fs'
import getNavyRc from '../navyrc'

describe('navyrc', function () {

  describe('getNavyRc', function () {

    let sandbox

    beforeEach(function () {
      sandbox = sinon.createSandbox()
    })

    afterEach(function () {
      sandbox.restore()
    })

    it('should read and parse the .navyrc JSON file from the given directory', async function () {
      const config = { services: ['api', 'web'], plugins: ['nodejs'] }
      const readStub = sandbox.stub(fs, 'readFileAsync').resolves(JSON.stringify(config))

      const result = await getNavyRc('/some/dir')

      expect(result).to.eql(config)
      expect(readStub.calledOnce).to.equal(true)
      expect(readStub.firstCall.args[0]).to.equal(path.join('/some/dir', '.navyrc'))
    })

    it('should return null when the file cannot be read', async function () {
      const err = Object.assign(new Error('not found'), { code: 'ENOENT' })
      sandbox.stub(fs, 'readFileAsync').rejects(err)

      const result = await getNavyRc('/missing/dir')

      expect(result).to.equal(null)
    })

    it('should return null when the file content is not valid JSON', async function () {
      sandbox.stub(fs, 'readFileAsync').resolves('not json {{{')

      const result = await getNavyRc('/dir')

      expect(result).to.equal(null)
    })

  })

})
