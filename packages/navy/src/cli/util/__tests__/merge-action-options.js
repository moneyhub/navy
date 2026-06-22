/* eslint-env mocha */

import { expect } from 'chai'
import sinon from 'sinon'
import { mergeActionOptions } from '../merge-action-options'

describe('cli/util/merge-action-options', function () {

  it('should return parsed opts when command is missing', function () {
    const opts = { navy: 'dev' }
    expect(mergeActionOptions(opts, null)).to.equal(opts)
  })

  it('should return parsed opts when optsWithGlobals is missing', function () {
    const opts = { navy: 'dev' }
    expect(mergeActionOptions(opts, {})).to.equal(opts)
  })

  it('should merge optsWithGlobals so global navy wins over subcommand defaults', function () {
    const command = {
      optsWithGlobals: () => ({ navy: 'dev', json: true }),
    }
    const merged = mergeActionOptions({ navy: 'default', json: false }, command)

    expect(merged.navy).to.equal('dev')
    expect(merged.json).to.equal(true)
  })

  it('should call optsWithGlobals on the command', function () {
    const spy = sinon.stub().returns({ navy: 'x' })
    mergeActionOptions({ navy: 'y' }, { optsWithGlobals: spy })

    expect(spy.calledOnce).to.equal(true)
  })

  it('should let an explicit subcommand option beat the inherited parent default', function () {
    const command = {
      optsWithGlobals: () => ({ navy: 'parent-default' }),
      getOptionValueSource: key => (key === 'navy' ? 'cli' : 'default'),
    }
    const merged = mergeActionOptions({ navy: 'from-subcommand' }, command)

    expect(merged.navy).to.equal('from-subcommand')
  })

  it('should keep the parent value when the subcommand value came from its default', function () {
    const command = {
      optsWithGlobals: () => ({ navy: 'from-parent' }),
      getOptionValueSource: () => 'default',
    }
    const merged = mergeActionOptions({ navy: 'subcommand-default' }, command)

    expect(merged.navy).to.equal('from-parent')
  })

})
