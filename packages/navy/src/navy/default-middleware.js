import {Navy} from './'
import developMiddleware from '../middleware/develop'
import tagOverrideMiddleware from '../middleware/tag-override'
import addVirtualHostsMiddleware from '../middleware/add-virtual-hosts'

export default (navy: Navy) => ([
  developMiddleware,
  tagOverrideMiddleware,
  addVirtualHostsMiddleware(navy),
])
