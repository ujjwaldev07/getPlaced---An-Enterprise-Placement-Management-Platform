import type { Request } from 'express'
import mongoose from 'mongoose'

export function pageParams(req: Request) {
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20))
  return { page, limit, skip: (page - 1) * limit }
}

export function oid(id?: string | string[]) {
  const str = Array.isArray(id) ? id[0] : id
  if (!str || !mongoose.isValidObjectId(str)) return null
  return new mongoose.Types.ObjectId(str)
}

export function zodError(e: any) {
  if (e?.issues?.length) {
    return { message: e.issues[0].message || 'Validation failed', field: e.issues[0].path?.[0] }
  }
  return { message: e?.message || 'Invalid data' }
}
