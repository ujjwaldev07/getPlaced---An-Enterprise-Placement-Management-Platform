import { APPLICATION_STATUS, LEGACY_APP_STATUS } from './constants.js'

const reverseLegacy = Object.fromEntries(Object.entries(LEGACY_APP_STATUS).map(([k, v]) => [v, k]))

export function statusFilter(status?: string) {
  if (!status || status === 'ALL') return undefined
  const legacy = reverseLegacy[status]
  return legacy ? { $in: [status, legacy] } : status
}

export function statusMatch(field: string, values: string[]) {
  const expanded = values.flatMap((status) => {
    const legacy = reverseLegacy[status]
    return legacy ? [status, legacy] : [status]
  })
  return { [field]: { $in: expanded } }
}

void APPLICATION_STATUS
