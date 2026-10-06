import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { config } from './config.js';
import { ALLOWED_RESUME_EXT, ALLOWED_RESUME_MIME } from './constants.js';
export const resumeUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.resumeMaxBytes, files: 1 },
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        if (!ALLOWED_RESUME_EXT.includes(ext)) {
            cb(new Error('Resume must be a PDF, DOC, or DOCX file'));
            return;
        }
        if (file.mimetype && !ALLOWED_RESUME_MIME.includes(file.mimetype)) {
            cb(new Error('Unsupported resume file type'));
            return;
        }
        cb(null, true);
    },
});
function sniffResume(buffer) {
    if (buffer.length < 8)
        return null;
    if (buffer.subarray(0, 4).toString('utf8') === '%PDF')
        return 'application/pdf';
    if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }
    if (buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0) {
        return 'application/msword';
    }
    return null;
}
export function validateResumeBuffer(file) {
    if (!file?.buffer?.length)
        throw new Error('Resume file is required');
    if (file.size > config.resumeMaxBytes) {
        throw new Error(`Resume must be smaller than ${Math.round(config.resumeMaxBytes / (1024 * 1024))}MB`);
    }
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_RESUME_EXT.includes(ext)) {
        throw new Error('Resume must be a PDF, DOC, or DOCX file');
    }
    const sniffed = sniffResume(file.buffer);
    if (!sniffed)
        throw new Error('The uploaded file does not look like a valid resume document');
    if (ext === '.pdf' && sniffed !== 'application/pdf')
        throw new Error('PDF validation failed');
    if (ext === '.doc' && sniffed !== 'application/msword')
        throw new Error('DOC validation failed');
    if (ext === '.docx' && !sniffed.includes('openxml'))
        throw new Error('DOCX validation failed');
    return sniffed;
}
export async function ensureUploadDir() {
    await fs.mkdir(config.uploadDir, { recursive: true });
}
export function safeOriginalName(name) {
    return path.basename(name).replace(/[^\w.\- ()]/g, '_').slice(0, 180);
}
export async function persistResumeFile(file) {
    await ensureUploadDir();
    const mime = validateResumeBuffer(file);
    const ext = path.extname(file.originalname || '').toLowerCase() || '.pdf';
    const storageKey = `${crypto.randomUUID()}${ext}`;
    if (storageKey.includes('..') || storageKey.includes('/') || storageKey.includes('\\')) {
        throw new Error('Invalid storage key');
    }
    const fullPath = path.join(config.uploadDir, storageKey);
    if (!fullPath.startsWith(config.uploadDir))
        throw new Error('Invalid upload path');
    await fs.writeFile(fullPath, file.buffer);
    return {
        storageKey,
        mimeType: mime,
        size: file.size,
        originalName: safeOriginalName(file.originalname || `resume${ext}`),
        fullPath,
    };
}
export function resumeDiskPath(storageKey) {
    const key = path.basename(storageKey);
    const fullPath = path.join(config.uploadDir, key);
    if (!fullPath.startsWith(config.uploadDir))
        throw new Error('Invalid storage key');
    return fullPath;
}
export async function removeResumeFile(storageKey) {
    try {
        await fs.unlink(resumeDiskPath(storageKey));
    }
    catch {
        // ignore missing files
    }
}
