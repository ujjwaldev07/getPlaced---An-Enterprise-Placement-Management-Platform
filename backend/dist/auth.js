import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from './config.js';
import { User } from './models.js';
export async function hashPassword(password) {
    return bcrypt.hash(password, 12);
}
export async function comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
}
export function signToken(user) {
    return jwt.sign({ id: String(user._id), role: user.role }, config.jwtSecret, {
        expiresIn: config.jwtExpires,
    });
}
export async function requireAuth(req, res, next) {
    try {
        const bearer = req.headers.authorization?.startsWith('Bearer ')
            ? req.headers.authorization.slice(7)
            : null;
        const token = bearer || req.cookies?.access_token;
        if (!token)
            return res.status(401).json({ message: 'Authentication required' });
        const decoded = jwt.verify(token, config.jwtSecret);
        const user = await User.findById(decoded.id).select('_id role');
        if (!user)
            return res.status(401).json({ message: 'Invalid or expired token' });
        req.user = { id: String(user._id), role: user.role };
        next();
    }
    catch {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
}
export function requireRole(role) {
    return (req, res, next) => req.user?.role === role ? next() : res.status(403).json({ message: 'Forbidden' });
}
export const requireAdmin = requireRole('admin');
export const requireStudent = requireRole('user');
export function publicUser(user) {
    return {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        course: user.course,
        graduationYear: user.graduationYear,
        cgpa: user.cgpa,
        skills: user.skills,
        bio: user.bio,
        currentResume: user.currentResume,
    };
}
export function setAuthCookie(res, token) {
    res.cookie('access_token', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.nodeEnv === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
}
