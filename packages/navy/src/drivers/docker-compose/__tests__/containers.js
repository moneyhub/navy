/* eslint-env mocha */

import {expect} from 'chai'
import {getContainerName} from '../containers'

describe('docker-compose', function () {

  describe('getContainerName', function () {

    it('should return a constructed container name', function () {
      expect(getContainerName(
        { normalisedName: 'testenv' },
        'myservice',
        1,
      )).to.equal('testenv_myservice_1')
    })

  })

})
