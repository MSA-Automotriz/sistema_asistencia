import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../database/prisma.js';
import { env } from '../../config/env.js';
import { AppError } from '../../common/errors/app-error.js';
import { hashToken, randomToken } from '../../utils/crypto.js';
const maxFailedLoginAttempts = 5;
const lockoutDurationMs = 15 * 60 * 1000;
const recoveryTokenExpirationMs = 15 * 60 * 1000;
const minimumRecoveryQuestions = 2;
const expirationMs = (value) => {
    const match = /^(\d+)([dhm])$/.exec(value);
    if (!match)
        return 30 * 24 * 60 * 60 * 1000;
    return Number(match[1]) * { m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2]];
};
export class AuthService {
    async login(identifier, password, meta, rememberMe = false) {
        const user = await prisma.user.findFirst({
            where: {
                OR: [{ email: identifier }, { employee: { employeeCode: identifier } }]
            },
            include: {
                role: { include: { rolePermissions: { include: { permission: true } } } },
                userPermissions: { include: { permission: true } }
            }
        });
        if (!user)
            throw new AppError(401, 'Credenciales inválidas');
        if (user.lockedUntil && user.lockedUntil > new Date())
            throw new AppError(423, 'La cuenta está bloqueada temporalmente por intentos fallidos');
        if (!(await bcrypt.compare(password, user.passwordHash))) {
            await this.recordFailedLogin(user.id, user.failedLoginAttempts, user.lockedUntil);
            throw new AppError(401, 'Credenciales inválidas');
        }
        if (user.status !== 'ACTIVE')
            throw new AppError(403, 'La cuenta no está activa');
        if (user.failedLoginAttempts > 0 || user.lockedUntil) {
            await prisma.user.update({
                where: { id: user.id },
                data: { failedLoginAttempts: 0, lockedUntil: null }
            });
        }
        return this.createSession(user, meta, rememberMe);
    }
    async refresh(refreshToken, meta) {
        const session = await prisma.session.findUnique({
            where: { refreshTokenHash: hashToken(refreshToken) },
            include: {
                user: {
                    include: {
                        role: { include: { rolePermissions: { include: { permission: true } } } },
                        userPermissions: { include: { permission: true } }
                    }
                }
            }
        });
        if (!session ||
            session.revokedAt ||
            session.expiresAt <= new Date() ||
            session.user.status !== 'ACTIVE')
            throw new AppError(401, 'Sesión inválida o vencida');
        await prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
        return this.createSession(session.user, meta, session.rememberMe);
    }
    async logout(refreshToken) {
        await prisma.session.updateMany({
            where: { refreshTokenHash: hashToken(refreshToken), revokedAt: null },
            data: { revokedAt: new Date() }
        });
    }
    async revokeAll(userId) {
        await prisma.session.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() }
        });
    }
    async revokeSession(userId, sessionId) {
        const result = await prisma.session.updateMany({
            where: { id: sessionId, userId, revokedAt: null },
            data: { revokedAt: new Date() }
        });
        if (!result.count)
            throw new AppError(404, 'Sesión activa no encontrada');
    }
    async activeSessions(userId) {
        return prisma.session.findMany({
            where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
            select: {
                id: true,
                ipAddress: true,
                userAgent: true,
                rememberMe: true,
                createdAt: true,
                lastActiveAt: true,
                expiresAt: true
            },
            orderBy: { lastActiveAt: 'desc' }
        });
    }
    async changePassword(userId, currentPassword, newPassword) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash)))
            throw new AppError(400, 'Contraseña actual inválida');
        await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: {
                    passwordHash: await bcrypt.hash(newPassword, 12),
                    failedLoginAttempts: 0,
                    lockedUntil: null
                }
            }),
            prisma.session.updateMany({
                where: { userId, revokedAt: null },
                data: { revokedAt: new Date() }
            })
        ]);
    }
    async setRecoveryQuestions(userId, questions) {
        const normalizedQuestions = questions.map(({ question, answer }) => ({
            question: question.trim(),
            answer: answer.trim()
        }));
        if (normalizedQuestions.length < minimumRecoveryQuestions)
            throw new AppError(400, `Debe registrar al menos ${minimumRecoveryQuestions} preguntas de recuperación`);
        if (normalizedQuestions.some(({ question, answer }) => !question || !answer))
            throw new AppError(400, 'Las preguntas y respuestas son obligatorias');
        if (new Set(normalizedQuestions.map(({ question }) => question.toLocaleLowerCase())).size !==
            normalizedQuestions.length)
            throw new AppError(400, 'No puede repetir preguntas de recuperación');
        const records = await Promise.all(normalizedQuestions.map(async ({ question, answer }) => ({
            userId,
            question,
            answerHash: await bcrypt.hash(answer, 12)
        })));
        await prisma.$transaction(async (transaction) => {
            await transaction.recoveryQuestion.deleteMany({ where: { userId } });
            await transaction.recoveryQuestion.createMany({ data: records });
        });
    }
    async getRecoveryQuestions(userId) {
        return prisma.recoveryQuestion.findMany({
            where: { userId },
            select: { id: true, question: true }
        });
    }
    async startPasswordRecovery(identifier) {
        const user = await prisma.user.findFirst({
            where: {
                OR: [{ email: identifier }, { employee: { employeeCode: identifier } }]
            },
            include: { recoveryQuestions: { select: { id: true, question: true } } }
        });
        if (!user ||
            user.status !== 'ACTIVE' ||
            user.recoveryQuestions.length < minimumRecoveryQuestions) {
            return { recoveryToken: null, expiresAt: null, questions: [] };
        }
        const recoveryToken = randomToken();
        const expiresAt = new Date(Date.now() + recoveryTokenExpirationMs);
        await prisma.$transaction([
            prisma.passwordResetToken.updateMany({
                where: { userId: user.id, usedAt: null },
                data: { usedAt: new Date() }
            }),
            prisma.passwordResetToken.create({
                data: { userId: user.id, tokenHash: hashToken(recoveryToken), expiresAt }
            })
        ]);
        return { recoveryToken, expiresAt, questions: user.recoveryQuestions };
    }
    async resetPasswordWithRecovery(identifier, recoveryToken, answers, newPassword) {
        const token = await prisma.passwordResetToken.findUnique({
            where: { tokenHash: hashToken(recoveryToken) },
            include: { user: { include: { recoveryQuestions: true, employee: true } } }
        });
        const isMatchingUser = token?.user.email === identifier || token?.user.employee?.employeeCode === identifier;
        if (!token ||
            !isMatchingUser ||
            token.usedAt ||
            token.expiresAt <= new Date() ||
            token.user.status !== 'ACTIVE') {
            throw new AppError(400, 'La recuperación de contraseña no es válida o venció');
        }
        const answersByQuestion = new Map(answers.map(({ questionId, answer }) => [questionId, answer.trim()]));
        const questions = token.user.recoveryQuestions;
        const validAnswers = questions.length >= minimumRecoveryQuestions &&
            answersByQuestion.size === questions.length &&
            (await Promise.all(questions.map(async (question) => {
                const answer = answersByQuestion.get(question.id);
                if (!answer)
                    return false;
                return bcrypt.compare(answer, question.answerHash);
            })).then((results) => results.every(Boolean)));
        if (!validAnswers)
            throw new AppError(400, 'Las respuestas de recuperación no son correctas');
        await prisma.$transaction([
            prisma.user.update({
                where: { id: token.userId },
                data: {
                    passwordHash: await bcrypt.hash(newPassword, 12),
                    failedLoginAttempts: 0,
                    lockedUntil: null
                }
            }),
            prisma.passwordResetToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }),
            prisma.session.updateMany({
                where: { userId: token.userId, revokedAt: null },
                data: { revokedAt: new Date() }
            })
        ]);
    }
    async recordFailedLogin(userId, previousAttempts, lockedUntil) {
        const lockExpired = lockedUntil !== null && lockedUntil <= new Date();
        const failedLoginAttempts = lockExpired ? 1 : previousAttempts + 1;
        await prisma.user.update({
            where: { id: userId },
            data: {
                failedLoginAttempts,
                lockedUntil: failedLoginAttempts >= maxFailedLoginAttempts
                    ? new Date(Date.now() + lockoutDurationMs)
                    : null
            }
        });
    }
    async createSession(user, meta, rememberMe) {
        const permissions = [
            ...new Set([
                ...user.role.rolePermissions.map(({ permission }) => permission.code),
                ...user.userPermissions.map(({ permission }) => permission.code)
            ])
        ];
        const refreshToken = randomToken();
        const refreshExpiration = rememberMe
            ? env.JWT_REMEMBER_ME_EXPIRES_IN
            : env.JWT_REFRESH_EXPIRES_IN;
        const session = await prisma.session.create({
            data: {
                userId: user.id,
                refreshTokenHash: hashToken(refreshToken),
                expiresAt: new Date(Date.now() + expirationMs(refreshExpiration)),
                rememberMe,
                ipAddress: meta.ip,
                userAgent: meta.userAgent
            }
        });
        const accessToken = jwt.sign({ sub: user.id, sid: session.id, role: user.role.name, permissions }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
        return {
            accessToken,
            refreshToken,
            sessionId: session.id,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role.name,
                permissions
            }
        };
    }
}
//# sourceMappingURL=auth-service.js.map