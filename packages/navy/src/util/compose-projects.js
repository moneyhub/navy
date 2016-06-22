/* @flow */

import {execAsync} from './exec-async'

export async function fetchLaunchedComposeProjects() {
  const projects = Array.from(
    new Set((await execAsync('docker', [
      'ps', '-a', '--format "{{.Label \\"com.docker.compose.project\\"}}"',
    ]))
    .split('\n')
    .filter(projectName => projectName !== '')),
  )

  return projects
}
