/* @flow */

export const Status = {
  RUNNING: 'running',
  EXITED: 'exited',
}

export type Service = {
  name: string,
  status: string,
  raw: ?Object,
}

export type ServiceList = Array<Service>
