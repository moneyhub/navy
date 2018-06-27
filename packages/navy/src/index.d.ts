declare module "navy" {
  export interface State {
    configProvider?: string
    path?: string
  }

  export enum ServiceStatus {
    RUNNING = "running",
    EXITED = "exited",
  }

  export type Service = {
    id: string
    name: string
    image: string
    status: ServiceStatus
    raw?: Object
  }

  export type ServiceList = Array<Service>

  export interface ServiceHealthData {
    service: string
    health: "healthy" | "unhealthy" | "starting"
  }

  export interface LaunchOptions {
    noDeps?: boolean
  }

  export interface Navy {
    destroy: () => Promise<void>
    externalIP: () => Promise<string>
    initialise: (opts: State) => Promise<void>
    isInitialised: () => Promise<boolean>
    launch: (
      services?: Array<string> | null,
      opts?: LaunchOptions,
    ) => Promise<void>
    start: (services?: Array<string>) => Promise<void>
    stop: (services?: Array<string>) => Promise<void>
    restart: (services?: Array<string>) => Promise<void>
    kill: (services?: Array<string>) => Promise<void>
    rm: (services?: Array<string>) => Promise<void>
    update: (services?: Array<string>) => Promise<void>
    port: (
      service: string,
      privatePort: number,
      index?: number,
    ) => Promise<number | undefined>
    spawnLogStream: (services?: Array<string>) => Promise<void>
    url: (service: string) => Promise<string>
    waitForHealthy: (
      services?: Array<string> | null,
      progressCallback?: (healthData: Array<ServiceHealthData>) => void,
      retryConfig?: {
        factor?: number,
        retries?: number,
        minTimeout?: number,
      },
    ) => Promise<boolean>
    ps(): Promise<ServiceList>
  }

  export function getNavy(name: string): Navy
}
