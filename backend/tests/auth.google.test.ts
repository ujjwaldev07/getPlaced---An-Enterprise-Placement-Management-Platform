import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'

// Mock only the external Google ID-token verification; keep the real
// implementations of token signing, password hashing, and auth middleware.
vi.mock('../src/auth.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/auth.js')>()
  return {
    ...actual,
    verifyGoogleIdToken: vi.fn(),
  }
})

// Hermetic in-memory data layer so the route tests do not require a live
// MongoDB deployment. Only the User model is exercised by the auth routes.
const { users, UserModel } = vi.hoisted(() => {
  interface StoredUser {
    _id: string
    name: string
    email: string
    password: string
    role: 'user' | 'admin'
    authProvider: string
    googleId?: string
    course?: string
    graduationYear?: number
  }

  const users: StoredUser[] = []
  let idCounter = 0

  // Mongoose-query-like thenable supporting the .select()/.sort()
  // chaining used by the auth and admin routes.
  function asQuery(result: unknown) {
    const queryLike: Record<string, unknown> = {
      then: (onFulfilled: (value: unknown) => unknown) =>
        onFulfilled(result),
      select: () => queryLike,
      sort: () => queryLike,
    }
    return queryLike
  }

  function findUser(query: Record<string, unknown>) {
    if (typeof query?.googleId === 'string') {
      return users.find((u) => u.googleId === query.googleId) ?? null
    }
    if (typeof query?.email === 'string') {
      return users.find((u) => u.email === query.email) ?? null
    }
    return null
  }

  const UserModel = {
    findOne: vi.fn((query: Record<string, unknown>) => asQuery(findUser(query))),
    findById: vi.fn((id: string) =>
      asQuery(users.find((u) => u._id === id) ?? null),
    ),
    create: vi.fn(async (data: Record<string, unknown>) => {
      const user = { _id: `user-${++idCounter}`, ...data }
      users.push(user)
      return user
    }),
    countDocuments: vi.fn(async (query: Record<string, unknown> = {}) => {
      if (query?.googleId) {
        return users.filter((u) => u.googleId === query.googleId).length
      }
      if (query?.role) {
        return users.filter((u) => u.role === query.role).length
      }
      return users.length
    }),
    deleteMany: vi.fn(async () => {
      users.length = 0
      return { deletedCount: 0 }
    }),
    find: vi.fn((query: Record<string, unknown> = {}) =>
      asQuery(users.filter((u) => !query?.role || u.role === query.role)),
    ),
    findByIdAndUpdate: vi.fn(),
  }

  return { users, UserModel }
})

vi.mock('../src/models.js', () => ({
  User: UserModel,
  Company: {},
  Drive: {},
  Resume: {},
  Application: {},
  Interview: {},
  Notification: {},
  Resource: {},
  AuditLog: {},
}))

import { router } from '../src/routes.js'
import { verifyGoogleIdToken, hashPassword, signToken } from '../src/auth.js'
import { config } from '../src/config.js'

const app = express()
app.use(express.json())
app.use('/api', router)

const verifyMock = vi.mocked(verifyGoogleIdToken)

const googlePayload = {
  sub: 'google-sub-001',
  email: 'google-user@example.com',
  email_verified: true,
  name: 'Google User',
  given_name: 'Google',
  family_name: 'User',
}

beforeEach(() => {
  users.length = 0
  verifyMock.mockReset()
  verifyMock.mockResolvedValue(googlePayload)
  UserModel.findOne.mockClear()
  UserModel.findById.mockClear()
  UserModel.create.mockClear()
  UserModel.countDocuments.mockClear()
  UserModel.find.mockClear()
})

describe('POST /api/auth/google', () => {
  it('creates a student account for a new Google user', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({
        credential: 'fake-id-token',
        role: 'user',
        course: 'B.Tech CSE',
        graduationYear: 2026,
      })

    expect(res.status).toBe(201)
    expect(res.body.token).toBeTruthy()
    expect(res.body.user.role).toBe('user')
    expect(res.body.user.email).toBe('google-user@example.com')

    expect(users).toHaveLength(1)
    expect(users[0].role).toBe('user')
    expect(users[0].authProvider).toBe('google')
    expect(users[0].googleId).toBe('google-sub-001')
  })

  it('returns the existing account on repeat Google login without duplicating', async () => {
    const first = await request(app)
      .post('/api/auth/google')
      .send({
        credential: 'fake-id-token',
        role: 'user',
        course: 'B.Tech CSE',
        graduationYear: 2026,
      })
    expect(first.status).toBe(201)

    const second = await request(app)
      .post('/api/auth/google')
      .send({
        credential: 'fake-id-token',
        role: 'user',
        course: 'B.Tech CSE',
        graduationYear: 2026,
      })
    expect(second.status).toBe(200)
    expect(second.body.user.id).toBe(first.body.user.id)

    expect(users).toHaveLength(1)
    expect(UserModel.create).toHaveBeenCalledTimes(1)
  })

  it('allows an existing student to sign in without registration-only fields', async () => {
    users.push({
      _id: 'existing-student',
      name: 'Google Student',
      email: 'google-user@example.com',
      password: 'hashed',
      role: 'user',
      authProvider: 'google',
      googleId: 'google-sub-001',
      course: 'B.Tech CSE',
      graduationYear: 2026,
    })

    const res = await request(app)
      .post('/api/auth/google')
      .send({ credential: 'fake-id-token', role: 'user' })

    expect(res.status).toBe(200)
    expect(res.body.user.id).toBe('existing-student')
    expect(UserModel.create).not.toHaveBeenCalled()
  })

  it('allows an existing admin to sign in without an invite code', async () => {
    users.push({
      _id: 'existing-admin',
      name: 'Google Admin',
      email: 'google-user@example.com',
      password: 'hashed',
      role: 'admin',
      authProvider: 'google',
      googleId: 'google-sub-001',
    })

    const res = await request(app)
      .post('/api/auth/google')
      .send({ credential: 'fake-id-token', role: 'admin' })

    expect(res.status).toBe(200)
    expect(res.body.user.id).toBe('existing-admin')
    expect(UserModel.create).not.toHaveBeenCalled()
  })

  it('still requires course details for a new Google student', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({ credential: 'fake-id-token', role: 'user', graduationYear: 2026 })

    expect(res.status).toBe(400)
    expect(res.body.message).toContain('Course is required')
    expect(users).toHaveLength(0)
  })

  it('still requires an invite code for a new Google admin', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({ credential: 'fake-id-token', role: 'admin' })

    expect(res.status).toBe(400)
    expect(res.body.message).toBe('Admin invite code is required')
    expect(users).toHaveLength(0)
  })

  it('rejects admin creation via Google without a valid invite code', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({ credential: 'fake-id-token', role: 'admin', adminCode: 'WRONG-CODE' })

    expect(res.status).toBe(403)
    expect(res.body.message).toBe('Invalid admin invite code')

    expect(users).toHaveLength(0)
    expect(UserModel.create).not.toHaveBeenCalled()
  })

  it('creates an admin account via Google with a valid invite code', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({ credential: 'fake-id-token', role: 'admin', adminCode: config.adminCode })

    expect(res.status).toBe(201)
    expect(res.body.user.role).toBe('admin')
    expect(res.body.user.email).toBe('google-user@example.com')

    expect(users).toHaveLength(1)
    expect(users[0].role).toBe('admin')
  })

  it('rejects an invalid Google credential', async () => {
    verifyMock.mockRejectedValueOnce(new Error('Invalid Google token: no payload'))

    const res = await request(app)
      .post('/api/auth/google')
      .send({
        credential: 'bad-token',
        role: 'user',
        course: 'B.Tech CSE',
        graduationYear: 2026,
      })

    expect(res.status).toBe(401)
    expect(users).toHaveLength(0)
  })

  it('rejects a request with no Google credential before verification', async () => {
    const res = await request(app).post('/api/auth/google').send({ role: 'user' })

    expect(res.status).toBe(400)
    expect(res.body.message).toBe('Google credential is required')
    expect(verifyMock).not.toHaveBeenCalled()
    expect(users).toHaveLength(0)
  })

  it('rejects expired or wrong-audience Google credentials', async () => {
    verifyMock.mockRejectedValueOnce(new Error('Google token audience mismatch'))

    const res = await request(app)
      .post('/api/auth/google')
      .send({ credential: 'wrong-audience-token', role: 'user' })

    expect(res.status).toBe(401)
    expect(users).toHaveLength(0)
  })

  it('classifies issuer, audience and expiry failures as 401 without leaking the credential', async () => {
    verifyMock.mockRejectedValueOnce(
      new Error(
        'Invalid issuer, expected one of [accounts.google.com, https://accounts.google.com], but got https://evil.example.com',
      ),
    )

    const res = await request(app)
      .post('/api/auth/google')
      .send({ credential: 'forged-id-token-value', role: 'user' })

    expect(res.status).toBe(401)
    expect(JSON.stringify(res.body)).not.toContain('forged-id-token-value')
    expect(users).toHaveLength(0)
    expect(UserModel.create).not.toHaveBeenCalled()
  })

  it('does not link a Google credential to an existing password account', async () => {
    users.push({
      _id: 'seed-local-2',
      name: 'Password Student',
      email: 'google-user@example.com',
      password: 'hashed',
      role: 'user',
      authProvider: 'local',
      course: 'B.Tech CSE',
      graduationYear: 2026,
    })

    const res = await request(app)
      .post('/api/auth/google')
      .send({
        credential: 'fake-id-token',
        role: 'user',
        course: 'B.Tech CSE',
        graduationYear: 2026,
      })

    expect(res.status).toBe(409)
    expect(users[0].authProvider).toBe('local')
    expect(users[0].googleId).toBeUndefined()
  })

  it('never elevates an existing Google student to admin through the role field', async () => {
    users.push({
      _id: 'seed-student-no-code',
      name: 'Google Student',
      email: 'google-user@example.com',
      password: 'hashed',
      role: 'user',
      authProvider: 'google',
      googleId: 'google-sub-001',
      course: 'B.Tech CSE',
      graduationYear: 2026,
    })

    const res = await request(app)
      .post('/api/auth/google')
      .send({ credential: 'fake-id-token', role: 'admin', adminCode: config.adminCode })

    expect(res.status).toBe(403)
    expect(users).toHaveLength(1)
    expect(users[0].role).toBe('user')
    expect(UserModel.create).not.toHaveBeenCalled()
  })

  it('rejects Google sign-in when the email already has a password account', async () => {
    users.push({
      _id: 'seed-local',
      name: 'Existing User',
      email: 'google-user@example.com',
      password: 'hashed',
      role: 'user',
      authProvider: 'local',
    })

    const res = await request(app)
      .post('/api/auth/google')
      .send({
        credential: 'fake-id-token',
        role: 'user',
        course: 'B.Tech CSE',
        graduationYear: 2026,
      })

    expect(res.status).toBe(409)
    expect(users).toHaveLength(1)
  })

  it('rejects a role mismatch for an existing Google account', async () => {
    users.push({
      _id: 'seed-google',
      name: 'Google User',
      email: 'google-user@example.com',
      password: 'hashed',
      role: 'user',
      authProvider: 'google',
      googleId: 'google-sub-001',
    })

    const res = await request(app)
      .post('/api/auth/google')
      .send({ credential: 'fake-id-token', role: 'admin', adminCode: config.adminCode })

    expect(res.status).toBe(403)
    expect(res.body.message).toContain('registered as a student')
    expect(users).toHaveLength(1)
  })

  it('rejects a role change before considering student registration fields', async () => {
    users.push({
      _id: 'seed-admin',
      name: 'Google Admin',
      email: 'google-user@example.com',
      password: 'hashed',
      role: 'admin',
      authProvider: 'google',
      googleId: 'google-sub-001',
    })

    const res = await request(app)
      .post('/api/auth/google')
      .send({ credential: 'fake-id-token', role: 'user' })

    expect(res.status).toBe(403)
    expect(res.body.message).toContain('registered as an admin')
    expect(users).toHaveLength(1)
  })
})

describe('POST /api/auth/login (password regression)', () => {
  it('logs in an existing student with email and password', async () => {
    const hashedPassword = await hashPassword('password123')
    users.push({
      _id: 'local-user',
      name: 'Local User',
      email: 'local@example.com',
      password: hashedPassword,
      role: 'user',
      authProvider: 'local',
    })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'local@example.com', password: 'password123' })

    expect(res.status).toBe(200)
    expect(res.body.token).toBeTruthy()
    expect(res.body.user.email).toBe('local@example.com')
    expect(res.body.user.role).toBe('user')
  })

  it('rejects login with a wrong password', async () => {
    const hashedPassword = await hashPassword('password123')
    users.push({
      _id: 'local-user-2',
      name: 'Local User',
      email: 'local2@example.com',
      password: hashedPassword,
      role: 'user',
      authProvider: 'local',
    })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'local2@example.com', password: 'wrong-password' })

    expect(res.status).toBe(401)
    expect(res.body.message).toBe('Invalid email or password')
  })
})

describe('POST /api/auth/logout', () => {
  it('clears the session cookie and reports success', async () => {
    const res = await request(app).post('/api/auth/logout')

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})

describe('role-based authorization', () => {
  it('rejects unauthenticated access to a protected route', async () => {
    const res = await request(app).get('/api/admin/students')

    expect(res.status).toBe(401)
  })

  it('blocks a student from an admin-only route', async () => {
    const student = {
      _id: 'student-1',
      name: 'Student',
      email: 'student@example.com',
      password: 'x',
      role: 'user' as const,
      authProvider: 'local',
    }
    users.push(student)
    const token = signToken(student)

    const res = await request(app)
      .get('/api/admin/students')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(403)
  })

  it('allows an admin to reach an admin-only route', async () => {
    const admin = {
      _id: 'admin-1',
      name: 'Admin',
      email: 'admin@example.com',
      password: 'x',
      role: 'admin' as const,
      authProvider: 'local',
    }
    users.push(admin)
    const token = signToken(admin)

    const res = await request(app)
      .get('/api/admin/students')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.students)).toBe(true)
  })
})
