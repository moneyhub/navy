/* @flow */

import { execFileSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { NavyError } from '../errors'

export function caughtErrorMessage(e: mixed): string {
  if (e == null) {
    return String(e)
  }
  if (e.message != null && e.message !== '') {
    return String(e.message)
  }
  return String(e)
}

function assertCaFile(caCrtPath: string): void {
  if (!fs.existsSync(caCrtPath)) {
    throw new NavyError(`CA certificate not found at ${caCrtPath}`)
  }
}

function installMacOSUserTrust(caCrtPath: string): void {
  const home = os.homedir()
  const candidates = [
    path.join(home, 'Library/Keychains/login.keychain-db'),
    path.join(home, 'Library/Keychains/login.keychain'),
  ]
  const keychain = candidates.find(p => fs.existsSync(p))
  if (!keychain) {
    throw new NavyError(
      'Could not find your macOS login keychain. Import the CA manually from Keychain Access:\n' +
      `  File → Import Items… → choose ${caCrtPath}\n` +
      'Then double‑click the certificate and set “When using this certificate” to “Always Trust”.'
    )
  }
  try {
    execFileSync('security', [
      'add-trusted-cert',
      '-d',
      '-r', 'trustRoot',
      '-k', keychain,
      caCrtPath,
    ], { stdio: 'inherit' })
  } catch (e) {
    const msg = caughtErrorMessage(e)
    const hint =
      'If this failed because the certificate is already installed, remove the old “navy-dev-ca” ' +
      'entry from Keychain Access and run `navy https --setup` again.\n\n' +
      'For a system‑wide trust store (requires an administrator password), run:\n' +
      `  sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ${caCrtPath}`
    throw new NavyError(`Could not add the Navy root CA to your login keychain.\n${hint}\n\n(${msg})`)
  }
}

function installLinux(caCrtPath: string): void {
  const debianScript = '/usr/sbin/update-ca-certificates'
  const fedoraScript = '/usr/bin/update-ca-trust'

  if (fs.existsSync(debianScript)) {
    const dest = '/usr/local/share/ca-certificates/navy-dev-ca.crt'
    try {
      execFileSync('sudo', ['cp', caCrtPath, dest], { stdio: 'inherit' })
      execFileSync('sudo', [debianScript], { stdio: 'inherit' })
    } catch (e) {
      const msg = caughtErrorMessage(e)
      throw new NavyError(
        'Could not install the Navy root CA using update-ca-certificates.\n' +
        `Copy ${caCrtPath} to ${dest} (with sudo) and run \`sudo update-ca-certificates\`, or consult your distro’s docs.\n\n(${msg})`
      )
    }
    return
  }

  if (fs.existsSync(fedoraScript)) {
    const dest = '/etc/pki/ca-trust/source/anchors/navy-dev-ca.crt'
    try {
      execFileSync('sudo', ['cp', caCrtPath, dest], { stdio: 'inherit' })
      execFileSync('sudo', [fedoraScript, 'extract'], { stdio: 'inherit' })
    } catch (e) {
      const msg = caughtErrorMessage(e)
      throw new NavyError(
        'Could not install the Navy root CA using update-ca-trust.\n' +
        `Copy ${caCrtPath} to ${dest} (with sudo) and run \`sudo update-ca-trust extract\`.\n\n(${msg})`
      )
    }
    return
  }

  throw new NavyError(
    'Automatic Linux install needs `update-ca-certificates` (Debian/Ubuntu) or `update-ca-trust` (Fedora/RHEL).\n' +
      'Install the CA yourself, for example:\n' +
      `  sudo cp ${caCrtPath} /usr/local/share/ca-certificates/navy-dev-ca.crt && sudo update-ca-certificates`
  )
}

function installWindows(caCrtPath: string): void {
  const systemRoot = process.env.SystemRoot || 'C:\\Windows'
  const certutil = path.join(systemRoot, 'System32', 'certutil.exe')
  if (!fs.existsSync(certutil)) {
    throw new NavyError(
      `certutil.exe not found under ${systemRoot}. Import ${caCrtPath} manually:\n` +
      '  certmgr.msc → Trusted Root Certification Authorities → Certificates → right‑click → All Tasks → Import'
    )
  }
  try {
    execFileSync(certutil, ['-user', '-addstore', 'Root', caCrtPath], { stdio: 'inherit' })
  } catch (e) {
    const msg = caughtErrorMessage(e)
    throw new NavyError(
      'Could not add the Navy root CA to the current user’s Trusted Root store.\n' +
      `Open certmgr.msc and import ${caCrtPath} under Trusted Root Certification Authorities.\n\n(${msg})`
    )
  }
}

/**
 * Installs the Navy development root CA into the OS trust store where supported
 * (macOS login keychain, Debian/Ubuntu update-ca-certificates, Fedora/RHEL update-ca-trust,
 * Windows per-user Trusted Roots). May invoke sudo on Linux.
 */
export function installRootCaToTrustStore(caCrtPath: string): void {
  const abs = path.resolve(caCrtPath)
  assertCaFile(abs)

  const platform = process.platform
  if (platform === 'darwin') {
    installMacOSUserTrust(abs)
  } else if (platform === 'linux') {
    installLinux(abs)
  } else if (platform === 'win32') {
    installWindows(abs)
  } else {
    throw new NavyError(
      `Automatic root CA install is not supported on ${platform}. Trust ${abs} manually as a root CA.`
    )
  }
}
