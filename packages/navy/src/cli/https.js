/* @flow */

import path from 'path'
import chalk from 'chalk'
import { NavyError } from '../errors'
import { getNavy } from '../navy'
import { getConfig, getConfigDir, DEFAULT_TLS_ROOT_CA_DIR } from '../config'
import { reconfigureHTTPProxy } from '../http-proxy'
import { createCert, generateRootCa, issueLeafCertForUrl, removeCert } from '../util/https'
import { installRootCaToTrustStore } from '../util/install-root-ca'
import fs from 'fs'

function normaliseServiceArgs(services: mixed): Array<string> {
  if (services == null) {
    return []
  }
  if (Array.isArray(services)) {
    const result: Array<string> = []
    for (const s of services) {
      if (typeof s === 'string' && s !== '') {
        result.push(s)
      }
    }
    return result
  }
  if (typeof services === 'string') {
    return services ? [services] : []
  }
  return []
}

async function issueHttpsForServices(
  navy: Object,
  serviceNames: Array<string>,
  availableServices: Array<string>
): Promise<Array<string>> {
  const httpsReadyServices = []
  for (const service of serviceNames) {
    if (!availableServices.includes(service)) {
      console.log(`❌ ${service} not found, skipping`)
      continue
    }
    const serviceUrl = await navy.url(service)
    try {
      await createCert({ serviceUrl })
      httpsReadyServices.push(service)
    } catch (error) {
      console.log(error)
      throw new NavyError(`Could not generate TLS cert for ${service}`)
    }
  }
  return httpsReadyServices
}

export default async function (services: mixed, opts: Object): Promise<void> {
  const tlsRootCaDir = getConfig().tlsRootCaDir || DEFAULT_TLS_ROOT_CA_DIR
  const configDir = getConfigDir()
  const serviceList = normaliseServiceArgs(services)

  const hasIssue = Boolean(opts.issue)

  if (opts.disable && (opts.setup || opts.all || hasIssue)) {
    throw new NavyError('`--disable` cannot be combined with `--setup`, `--all`, or `--issue`.')
  }
  if ([opts.setup, opts.all, hasIssue].filter(Boolean).length > 1) {
    throw new NavyError('Use only one of `--setup`, `--all`, or `--issue`.')
  }

  if (opts.disable) {
    await removeCert(opts)

    // Guard isInitialised so `--disable` still works when the navy has
    // never been launched (otherwise getNavyFile throws).
    const navy = await getNavy(opts.navy)
    const navyFile = (await navy.isInitialised()) ? await navy.getNavyFile() : undefined
    await reconfigureHTTPProxy({ restart: true, navyFile })

    console.log()
    console.log(chalk.green(`✅ HTTPS for service ${opts.disable} is now disabled`))
    console.log()
    return
  }

  if (opts.setup) {
    if (serviceList.length > 0) {
      throw new NavyError('`navy https --setup` does not take service names. Run `navy https <service>…` separately to issue service certificates.')
    }
    await generateRootCa()
    const caCrt = path.join(tlsRootCaDir, 'ca.crt')
    installRootCaToTrustStore(caCrt)
    console.log()
    console.log(chalk.green('✅ Navy root CA is installed in your trust store (where supported).'))
    console.log(chalk.dim('Browsers that use their own NSS store (e.g. Firefox) may still need the CA imported there.'))
    console.log()
    return
  }

  if (opts.all) {
    if (serviceList.length > 0) {
      throw new NavyError('`navy https --all` does not take service names. Omit them, or name services without `--all`.')
    }
    if (!fs.existsSync(`${tlsRootCaDir}/ca.crt`) || !fs.existsSync(`${tlsRootCaDir}/ca.key`)) {
      await generateRootCa()
    }
    const navy = await getNavy(opts.navy)
    await navy.ensurePluginsLoaded()
    const availableServices = await navy.getAvailableServiceNames()
    if (availableServices.length === 0) {
      console.log()
      console.log(chalk.yellow('No services found in this navy; nothing to enable HTTPS for.'))
      console.log()
      return
    }
    const httpsReadyServices = await issueHttpsForServices(navy, availableServices, availableServices)
    await reconfigureHTTPProxy({ restart: true, navyFile: await navy.getNavyFile() })
    console.log()
    console.log(chalk.green(`✅ Service(s) ${httpsReadyServices.join(', ')} now accessible via HTTPS🔒`))
    console.log()
    return
  }

  if (hasIssue) {
    if (serviceList.length > 0) {
      throw new NavyError('`navy https --issue` does not take service names.')
    }
    const outDir = opts.issueOut ? path.resolve(opts.issueOut) : process.cwd()
    const paths = await issueLeafCertForUrl(String(opts.issue), outDir)
    console.log()
    console.log(chalk.green('✅ TLS certificate issued for use outside Navy:'))
    console.log(`   ${paths.certPath}`)
    console.log(`   ${paths.keyPath}`)
    console.log(`   ${paths.caCopyPath} (root CA; configure clients to trust this or append as a chain file)`)
    console.log()
    return
  }

  if (serviceList.length === 0) {
    if (!fs.existsSync(`${configDir}/tls-certs`)) return

    const files = fs.readdirSync(`${configDir}/tls-certs`)
    const urls = files.filter((file) => file.endsWith('.crt'))
      .map((crt) => { return `https://${crt.replace('.crt', '')}` })
    for (const url of urls) {
      console.log(`${url}`)
    }
    return
  }

  if (!fs.existsSync(`${tlsRootCaDir}/ca.crt`) || !fs.existsSync(`${tlsRootCaDir}/ca.key`)) {
    await generateRootCa()
  }

  const navy = await getNavy(opts.navy)
  await navy.ensurePluginsLoaded()
  const availableServices = await navy.getAvailableServiceNames()

  const httpsReadyServices = await issueHttpsForServices(navy, serviceList, availableServices)

  await reconfigureHTTPProxy({ restart: true, navyFile: await navy.getNavyFile() })

  console.log()
  console.log(chalk.green(`✅ Service(s) ${httpsReadyServices.join(', ')} now accessible via HTTPS🔒`))
  console.log()
}
