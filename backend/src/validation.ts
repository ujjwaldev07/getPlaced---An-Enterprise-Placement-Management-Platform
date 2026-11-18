import { z } from 'zod'

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Full name must be at least 2 characters').max(80, 'Full name is too long'),
    email: z.string().trim().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password is too long'),
    role: z.enum(['user', 'admin']).default('user'),
    adminCode: z.string().optional(),
    course: z.string().optional(),
    graduationYear: z
      .union([z.number(), z.string()])
      .optional()
      .transform((val) => {
        if (val === undefined || val === null || val === '') return undefined
        const num = Number(val)
        return isNaN(num) ? undefined : num
      }),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'admin') {
      if (!data.adminCode || data.adminCode.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['adminCode'],
          message: 'Admin invite code is required',
        })
      }
    } else {
      if (!data.course || data.course.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['course'],
          message: 'Course is required for student registration (e.g. B.Tech CSE)',
        })
      }
      if (data.graduationYear === undefined || data.graduationYear < 2020 || data.graduationYear > 2035) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['graduationYear'],
          message: 'Valid graduation year is required (e.g. 2026)',
        })
      }
    }
  })

export const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
})

export const companySchema = z.object({
  name: z.string().trim().min(2, 'Company name is required').max(120),
  logo: z.string().trim().optional().or(z.literal('')),
  website: z.string().trim().optional().or(z.literal('')),
  industry: z.string().trim().optional().or(z.literal('')),
  description: z.string().trim().max(4000).optional().or(z.literal('')),
  location: z.string().trim().optional().or(z.literal('')),
  companySize: z.string().trim().optional().or(z.literal('')),
  recruiterName: z.string().trim().optional().or(z.literal('')),
  recruiterEmail: z.string().trim().optional(),
  recruiterPhone: z.string().trim().optional().or(z.literal('')),
  isActive: z.boolean().optional(),
})

export const companyPatchSchema = companySchema.partial()

export const driveSchema = z.object({
  companyId: z.string().min(1, 'Company is required').optional(),
  company: z.string().trim().min(2, 'Company name is required').optional(),
  title: z.string().trim().min(2, 'Job title is required'),
  location: z.string().trim().min(2, 'Location is required'),
  type: z.string().trim().min(2, 'Employment type is required'),
  package: z.string().trim().min(1, 'Compensation package is required'),
  deadline: z.coerce.date(),
  driveDate: z.coerce.date().optional(),
  description: z.string().optional(),
  eligibility: z.string().optional(),
  eligibleCourses: z.array(z.string()).optional(),
  minimumCGPA: z.coerce.number().min(0).max(10).optional(),
  graduationYear: z.coerce.number().optional(),
  requiredSkills: z.array(z.string()).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'CANCELLED']).optional(),
  logo: z.string().optional(),
})

export const applySchema = z.object({
  coverLetter: z.string().trim().max(4000).optional().or(z.literal('')),
  resumeId: z.string().optional(),
})

export const applicationStatusSchema = z.object({
  status: z.enum([
    'APPLIED',
    'UNDER_REVIEW',
    'SHORTLISTED',
    'INTERVIEW_SCHEDULED',
    'INTERVIEWED',
    'SELECTED',
    'REJECTED',
    'WITHDRAWN',
  ]),
  notes: z.string().trim().max(4000).optional(),
  rejectionReason: z.string().trim().max(1000).optional(),
})

export const interviewSchema = z.object({
  applicationId: z.string().min(1, 'Application is required'),
  roundName: z.string().trim().min(2).max(80).default('Technical Interview'),
  interviewType: z.enum(['ONLINE', 'OFFLINE']).default('ONLINE'),
  scheduledAt: z.coerce.date(),
  duration: z.coerce.number().min(10).max(480).optional(),
  location: z.string().trim().optional(),
  meetingLink: z.string().trim().optional(),
  interviewerName: z.string().trim().optional(),
  interviewerEmail: z.string().trim().email().optional().or(z.literal('')),
  instructions: z.string().trim().max(2000).optional(),
})

export const interviewPatchSchema = interviewSchema.partial().extend({
  status: z.enum(['SCHEDULED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  result: z.enum(['PENDING', 'PASSED', 'FAILED']).optional(),
  feedback: z.string().trim().max(4000).optional(),
  advanceApplication: z.boolean().optional(),
  selectStudent: z.boolean().optional(),
})

export const announcementSchema = z.object({
  title: z.string().trim().min(2).max(120),
  message: z.string().trim().min(2).max(2000),
})
