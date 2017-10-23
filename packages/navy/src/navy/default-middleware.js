import developMiddleware from '../middleware/develop'
import tagOverrideMiddleware from '../middleware/tag-override'
import portOverrideMiddleware from '../middleware/port-override'
import addVirtualHostsMiddleware from '../middleware/add-virtual-hosts'
import setEnvironmentVariables from '../middleware/set-env-vars'
import setLoggingDriver from '../middleware/set-logging-driver'

import type {Navy} from './'

export default (navy: Navy) => ([
  developMiddleware,
  tagOverrideMiddleware,
  portOverrideMiddleware,
  setEnvironmentVariables,
  setLoggingDriver,
  addVirtualHostsMiddleware(navy),
])
