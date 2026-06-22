/* eslint-env mocha */

import { expect } from 'chai'
import proxyquire from 'proxyquire'

describe('navy/plugin-interface', function () {

  describe('loadPlugins', function () {

    function loadModule(stubs) {
      return proxyquire.noCallThru()('../plugin-interface', stubs)
    }

    it('should throw an invariant violation if the navy has no config provider', async function () {
      const { loadPlugins } = loadModule({})
      const navy = {
        name: 'env',
        getConfigProvider: async () => null,
      }

      let caught
      try {
        await loadPlugins(navy, { plugins: [] })
      } catch (err) {
        caught = err
      }

      expect(caught).to.be.an('error')
      expect(caught.message).to.match(/NO_CONFIG_PROVIDER/)
    })

    it('should return an empty array when navyFile has no plugins entry', async function () {
      const { loadPlugins } = loadModule({})
      const navy = {
        getConfigProvider: async () => ({ getNavyPath: async () => '/some/path' }),
      }

      expect(await loadPlugins(navy, {})).to.eql([])
    })

    it('should resolve plugins by name relative to the navy path and instantiate them with the navy', async function () {
      const fakePluginPath = '/abs/path/to/plugin'
      const fakePluginInstance = { meta: 'instance' }
      const PluginCtor = (navy) => ({ ...fakePluginInstance, navy })
      const { loadPlugins } = loadModule({
        resolve: (pluginName, opts, cb) => cb(null, fakePluginPath),
        [fakePluginPath]: PluginCtor,
      })

      const navy = {
        getConfigProvider: async () => ({ getNavyPath: async () => '/navy/path' }),
      }

      const plugins = await loadPlugins(navy, { plugins: ['my-plugin'] })

      expect(plugins).to.have.lengthOf(1)
      expect(plugins[0]).to.have.property('meta', 'instance')
      expect(plugins[0]).to.have.property('navy', navy)
    })

    it('should throw PLUGIN_RESOLVE_ERR with the joined plugin names when resolution fails', async function () {
      const { loadPlugins } = loadModule({
        resolve: (pluginName, opts, cb) => cb(new Error('not found')),
      })
      const navy = {
        getConfigProvider: async () => ({ getNavyPath: async () => '/navy/path' }),
      }

      let caught
      try {
        await loadPlugins(navy, { plugins: ['plugin-a', 'plugin-b'] })
      } catch (err) {
        caught = err
      }

      expect(caught).to.be.an('error')
      expect(caught.message).to.match(/PLUGIN_RESOLVE_ERR/)
      expect(caught.message).to.contain('plugin-a, plugin-b')
    })

    it('should throw PLUGIN_DOESNT_EXPORT_FUNCTION when a plugin module is not a function', async function () {
      const fakePluginPath = '/abs/path/to/bad-plugin'
      const { loadPlugins } = loadModule({
        resolve: (pluginName, opts, cb) => cb(null, fakePluginPath),
        [fakePluginPath]: { notAFunction: true },
      })
      const navy = {
        getConfigProvider: async () => ({ getNavyPath: async () => '/navy/path' }),
      }

      let caught
      try {
        await loadPlugins(navy, { plugins: ['bad-plugin'] })
      } catch (err) {
        caught = err
      }

      expect(caught).to.be.an('error')
      expect(caught.message).to.match(/PLUGIN_DOESNT_EXPORT_FUNCTION/)
      expect(caught.message).to.contain('bad-plugin')
    })

  })

})
