export type Role = 'user' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  avatar?: string
  phone?: string
  course?: string
  graduationYear?: number
  cgpa?: number
  skills?: string[]
  bio?: string
  currentResume?: string
}

export interface ResumeFile {
  id: string
  originalName: string
  mimeType: string
  size: number
  uploadedAt: string
}

export interface Company {
  _id: string
  name: string
  logo?: string
  website?: string
  industry?: string
  description?: string
  location?: string
  companySize?: string
  recruiterName?: string
  recruiterEmail?: string
  recruiterPhone?: string
  isActive?: boolean
  driveCount?: number
  applicationCount?: number
  shortlistedCount?: number
  selectedCount?: number
  createdAt?: string
}

export interface Drive {
  _id: string
  company: string
  companyId?: string
  logo?: string
  title: string
  jobTitle?: string
  location: string
  type: string
  package: string
  deadline: string
  driveDate?: string
  description: string
  eligibility: string
  eligibleCourses?: string[]
  minimumCGPA?: number
  graduationYear?: number
  requiredSkills?: string[]
  status: string
  applicants?: number
}

export interface Application {
  _id: string
  drive: Drive | string
  student?: Partial<User> & { _id?: string; name?: string; email?: string }
  company?: string
  role?: string
  resume?: ResumeFile | string | null
  coverLetter?: string
  status: string
  appliedAt: string
  notes?: string
  rejectionReason?: string
}

export interface Interview {
  _id: string
  company: string
  role: string
  student?: string | (Partial<User> & { studentName?: string; phone?: string })
  studentName?: string
  studentEmail?: string
  studentPhone?: string
  roundName?: string
  date: string
  scheduledAt?: string
  mode: string
  interviewType?: string
  link?: string
  meetingLink?: string
  location?: string
  status: string
  result?: string
  duration?: number
  instructions?: string
  interviewerName?: string
  interviewerEmail?: string
  feedback?: string
  application?: string
}

export interface Notification {
  _id: string
  type?: string
  title: string
  message: string
  read: boolean
  isRead?: boolean
  createdAt: string
}

export interface Resource {
  _id: string
  title: string
  type: string
  url: string
  description?: string
}
