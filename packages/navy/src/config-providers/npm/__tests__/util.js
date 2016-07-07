/* eslint-env mocha */

import {expect} from 'chai'
import {pathToModule} from '../util'

describe('npm config provider', function () {

  describe('pathToModule', function () {

    it('should return the correct path to the module', function () {
      expect(pathToModule('/root', 'my-environment')).to.equal('/root/my-environment')
      expect(pathToModule('/root', '@my-org/my-environment')).to.equal('/root/@my-org/my-environment')
      expect(pathToModule('/root', '@my-org/my-environment@some-tag')).to.equal('/root/@my-org/my-environment')
    })

  })

})
