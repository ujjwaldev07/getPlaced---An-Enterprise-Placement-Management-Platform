import 'dotenv/config'
import path from 'node:path'

export const config = {
  port: Number(process.env.PORT || 3050),
  mongo: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/getplaced',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-change-me',
  jwtExpires: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  adminCode: process.env.ADMIN_INVITE_CODE || 'GETPLACED-ADMIN-2026',
  nodeEnv: process.env.NODE_ENV || 'development',
  resumeMaxBytes: Number(process.env.RESUME_MAX_BYTES || 5 * 1024 * 1024),
  uploadDir: process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads', 'resumes'),
}
