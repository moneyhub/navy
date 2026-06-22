/* eslint-env mocha */

import { expect } from 'chai'
import { Command } from 'commander'

/**
 * These tests check that the commander configuration the navy CLI relies on
 * (positional options + per-subcommand option declarations) rejects options
 * that a subcommand does not declare, using the exact error format commander
 * emits by default.
 *
 * We build a minimal program with the same shape as packages/navy/src/cli/program.js
 * rather than loading that module, because importing program.js has side effects
 * (config reading, action wiring) that are not relevant to argument parsing.
 */
describe('cli/program unknown option handling', function () {

  function buildProgram() {
    const program = new Command()
    program.exitOverride()
    program.configureOutput({ writeErr: () => {}, writeOut: () => {} })

    program.enablePositionalOptions()
    program.option('-e, --navy [env]', 'set the navy name to be used', 'dev')

    program
      .command('status')
      .option('--json', 'output JSON instead of a table')
      .action(() => {})

    program
      .command('start [services...]')
      .option('-e, --navy [env]', 'set the navy name to be used', 'dev')
      .action(() => {})

    return program
  }

  describe('a subcommand that does not declare the option', function () {

    it('should throw a commander error for an unknown short option', function () {
      const program = buildProgram()

      expect(() => program.parse(['node', 'navy', 'status', '-e', 'foo']))
        .to.throw(/unknown option '-e'/)
    })

    it('should produce a non-zero exit code on the thrown error', function () {
      const program = buildProgram()

      try {
        program.parse(['node', 'navy', 'status', '-e', 'foo'])
        expect.fail('expected parse to throw')
      } catch (ex) {
        expect(ex.exitCode).to.be.greaterThan(0)
      }
    })

    it('should emit the canonical commander unknown-option message', function () {
      const program = buildProgram()

      try {
        program.parse(['node', 'navy', 'status', '-e', 'foo'])
        expect.fail('expected parse to throw')
      } catch (ex) {
        expect(ex.message).to.equal("error: unknown option '-e'")
      }
    })

    it('should still accept declared options on the same subcommand', function () {
      const program = buildProgram()

      expect(() => program.parse(['node', 'navy', 'status', '--json']))
        .to.not.throw()
    })

  })

  describe('a subcommand that declares the option', function () {

    it('should accept the option after the subcommand name', function () {
      const program = buildProgram()

      expect(() => program.parse(['node', 'navy', 'start', '-e', 'foo']))
        .to.not.throw()
    })

    it('should accept the option before the subcommand name (parent inherits)', function () {
      const program = buildProgram()

      expect(() => program.parse(['node', 'navy', '-e', 'foo', 'start']))
        .to.not.throw()
    })

  })

})
