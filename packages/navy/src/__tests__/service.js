/* eslint-env mocha */

import { expect } from 'chai'
import { Status } from '../service'

describe('service', function () {

  describe('Status', function () {

    it('should expose RUNNING and EXITED string constants', function () {
      expect(Status).to.eql({
        RUNNING: 'running',
        EXITED: 'exited',
      })
    })

  })

})
