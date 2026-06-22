/* eslint-env mocha */

import { expect } from 'chai'
import stripAnsi from 'strip-ansi'
import table from '../table'

describe('table', function () {

  it('should return an empty string when given no rows', function () {
    expect(table([])).to.equal('')
  })

  it('should render a single-row table padded by 2 spaces', function () {
    const result = table([['a', 'bb']])

    expect(result).to.equal('a  bb  ')
  })

  it('should pad each column to the longest value in that column plus 2', function () {
    const result = table([
      ['name', 'status'],
      ['api', 'running'],
      ['web', 'stopped'],
    ])

    const lines = result.split('\n')
    expect(lines).to.have.lengthOf(3)
    expect(lines[0]).to.equal('name  status   ')
    expect(lines[1]).to.equal('api   running  ')
    expect(lines[2]).to.equal('web   stopped  ')
  })

  it('should treat null/undefined cells in the header as empty strings when sizing', function () {
    const result = table([
      [null, 'b'],
      ['xx', 'yyy'],
    ])

    const lines = result.split('\n')
    expect(lines[0]).to.equal('    b    ')
    expect(lines[1]).to.equal('xx  yyy  ')
  })

  it('should only render the cells that exist on each row (shorter rows are not back-padded)', function () {
    const result = table([
      ['a', 'b'],
      ['x'],
    ])

    const lines = result.split('\n')
    expect(lines[0]).to.equal('a  b  ')
    expect(lines[1]).to.equal('x  ')
  })

  it('should size columns by visible (ANSI-stripped) length', function () {
    const ansiCell = '\u001b[31mhello\u001b[0m'
    const result = table([
      ['col1'],
      [ansiCell],
    ])

    const lines = result.split('\n')

    expect(stripAnsi(lines[0])).to.equal('col1   ')
    expect(stripAnsi(lines[1])).to.equal('hello  ')
  })

})
