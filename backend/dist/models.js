import { Schema, model } from 'mongoose';
import { APPLICATION_STATUS, DRIVE_STATUS, INTERVIEW_RESULT, INTERVIEW_STATUS, INTERVIEW_TYPE, } from './constants.js';
const userSchema = new Schema({
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user', index: true },
    avatar: { type: String },
    phone: { type: String },
    course: { type: String },
    graduationYear: { type: Number },
    cgpa: { type: Number, min: 0, max: 10 },
    skills: { type: [String], default: [] },
    bio: { type: String },
    currentResume: { type: Schema.Types.ObjectId, ref: 'Resume' },
}, { timestamps: true });
const companySchema = new Schema({
    name: { type: String, required: true, unique: true, trim: true },
    logo: { type: String },
    website: { type: String },
    industry: { type: String },
    description: { type: String },
    location: { type: String },
    companySize: { type: String },
    recruiterName: { type: String },
    recruiterEmail: { type: String },
    recruiterPhone: { type: String },
    isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });
companySchema.index({ industry: 1, isActive: 1 });
const driveSchema = new Schema({
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', index: true },
    company: { type: String, required: true, index: true },
    logo: { type: String },
    title: { type: String, required: true },
    location: { type: String },
    type: { type: String },
    package: { type: String },
    deadline: { type: Date },
    driveDate: { type: Date },
    description: { type: String },
    eligibility: { type: String },
    eligibleCourses: { type: [String], default: [] },
    minimumCGPA: { type: Number },
    graduationYear: { type: Number },
    requiredSkills: { type: [String], default: [] },
    status: { type: String, default: 'DRAFT', index: true },
    applicants: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
driveSchema.index({ companyId: 1, status: 1 });
driveSchema.index({ status: 1, deadline: 1 });
const resumeSchema = new Schema({
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    originalName: { type: String, required: true },
    storageKey: { type: String, required: true, unique: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now },
}, { timestamps: true });
const applicationSchema = new Schema({
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    drive: { type: Schema.Types.ObjectId, ref: 'Drive', required: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', index: true },
    resume: { type: Schema.Types.ObjectId, ref: 'Resume' },
    coverLetter: { type: String, maxlength: 4000 },
    status: { type: String, enum: APPLICATION_STATUS, default: 'APPLIED', index: true },
    appliedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    shortlistedAt: { type: Date },
    rejectedAt: { type: Date },
    rejectionReason: { type: String },
    notes: { type: String, maxlength: 4000 },
}, { timestamps: true });
applicationSchema.index({ student: 1, drive: 1 }, { unique: true });
applicationSchema.index({ companyId: 1, status: 1 });
applicationSchema.index({ appliedAt: -1 });
const interviewSchema = new Schema({
    application: { type: Schema.Types.ObjectId, ref: 'Application', index: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', index: true },
    drive: { type: Schema.Types.ObjectId, ref: 'Drive' },
    company: { type: String },
    role: { type: String },
    roundName: { type: String, default: 'Interview' },
    interviewType: { type: String, enum: INTERVIEW_TYPE, default: 'ONLINE' },
    date: { type: Date },
    scheduledAt: { type: Date, index: true },
    duration: { type: Number, default: 45 },
    location: { type: String },
    link: { type: String },
    meetingLink: { type: String },
    interviewerName: { type: String },
    interviewerEmail: { type: String },
    instructions: { type: String },
    status: { type: String, default: 'SCHEDULED', index: true },
    result: { type: String, enum: INTERVIEW_RESULT, default: 'PENDING' },
    feedback: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
interviewSchema.index({ student: 1, scheduledAt: 1 });
const notificationSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    type: { type: String, default: 'GENERAL', index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    relatedEntityId: { type: Schema.Types.ObjectId },
    relatedEntityType: { type: String },
    read: { type: Boolean, default: false, index: true },
}, { timestamps: true });
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
const resourceSchema = new Schema({
    title: { type: String, required: true },
    type: { type: String },
    url: { type: String },
    description: { type: String },
}, { timestamps: true });
const auditLogSchema = new Schema({
    actor: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true, index: true },
    entityType: { type: String },
    entityId: { type: Schema.Types.ObjectId },
    meta: { type: Schema.Types.Mixed },
}, { timestamps: true });
auditLogSchema.index({ createdAt: -1 });
export const User = model('User', userSchema);
export const Company = model('Company', companySchema);
export const Drive = model('Drive', driveSchema);
export const Resume = model('Resume', resumeSchema);
export const Application = model('Application', applicationSchema);
export const Interview = model('Interview', interviewSchema);
export const Notification = model('Notification', notificationSchema);
export const Resource = model('Resource', resourceSchema);
export const AuditLog = model('AuditLog', auditLogSchema);
void DRIVE_STATUS;
void INTERVIEW_STATUS;
