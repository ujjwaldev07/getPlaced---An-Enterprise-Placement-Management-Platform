import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import morgan from 'morgan'
import { config } from './config.js'
import { connectDB } from './db.js'
import { router } from './routes.js'
import { ensureUploadDir } from './uploads.js'

const app = express()
app.set('trust proxy', 1)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
)
app.use(compression())
const allowedOrigins = new Set(
  [config.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'].filter(Boolean),
)

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin) || config.nodeEnv === 'development') {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
  }),
)
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'))
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false }))
app.use('/api', router)
app.use((_, res) => res.status(404).json({ message: 'Route not found' }))
app.use((err: any, _req: any, res: any, _next: any) => {
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: `Resume must be smaller than ${Math.round(config.resumeMaxBytes / (1024 * 1024))}MB` })
  }
  if (err?.message && /resume|file type|PDF|DOC/i.test(err.message)) {
    return res.status(400).json({ message: err.message })
  }
  console.error(err)
  res.status(500).json({ message: 'Internal server error' })
})

Promise.all([connectDB(), ensureUploadDir()])
  .then(() => app.listen(config.port, () => console.log(`getPlaced API running on http://localhost:${config.port}`)))
  .catch((err) => {
    console.error('Database connection failed', err)
    process.exit(1)
  })
