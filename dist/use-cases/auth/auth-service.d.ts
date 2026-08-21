type RequestMeta = {
    ip?: string;
    userAgent?: string;
};
type RecoveryQuestionInput = {
    question: string;
    answer: string;
};
type RecoveryAnswerInput = {
    questionId: string;
    answer: string;
};
export declare class AuthService {
    login(identifier: string, password: string, meta: RequestMeta, rememberMe?: boolean): Promise<{
        accessToken: string;
        refreshToken: string;
        sessionId: string;
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            role: string;
            permissions: string[];
        };
    }>;
    refresh(refreshToken: string, meta: RequestMeta): Promise<{
        accessToken: string;
        refreshToken: string;
        sessionId: string;
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            role: string;
            permissions: string[];
        };
    }>;
    logout(refreshToken: string): Promise<void>;
    revokeAll(userId: string): Promise<void>;
    revokeSession(userId: string, sessionId: string): Promise<void>;
    activeSessions(userId: string): Promise<{
        id: string;
        expiresAt: Date;
        rememberMe: boolean;
        ipAddress: string | null;
        userAgent: string | null;
        lastActiveAt: Date;
        createdAt: Date;
    }[]>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
    setRecoveryQuestions(userId: string, questions: RecoveryQuestionInput[]): Promise<void>;
    getRecoveryQuestions(userId: string): Promise<{
        id: string;
        question: string;
    }[]>;
    startPasswordRecovery(identifier: string): Promise<{
        recoveryToken: null;
        expiresAt: null;
        questions: never[];
    } | {
        recoveryToken: string;
        expiresAt: Date;
        questions: {
            id: string;
            question: string;
        }[];
    }>;
    resetPasswordWithRecovery(identifier: string, recoveryToken: string, answers: RecoveryAnswerInput[], newPassword: string): Promise<void>;
    private recordFailedLogin;
    private createSession;
}
export {};
