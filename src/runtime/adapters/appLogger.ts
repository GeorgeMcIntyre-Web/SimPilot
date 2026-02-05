import type { Logger } from '../../core/adapters/Logger'
import { log } from '../../lib/log'

export const appLogger: Logger = {
  debug: (message, ...args) => log.debug(message, ...args),
  info: (message, ...args) => log.info(message, ...args),
  warn: (message, ...args) => log.warn(message, ...args),
  error: (message, ...args) => log.error(message, ...args),
}
