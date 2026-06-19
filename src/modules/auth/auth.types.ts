export type JwtPayload = {
    sub: string;
    email: string;
    sessionId: string;
};

export type AuthenticatedUser = JwtPayload;

export type SafeUser = {
    id: string;
    email: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
};

export type AuthResponse = {
    accessToken: string;
    refreshToken: string;
    user: SafeUser;
};

export type RequestMetadata = {
    userAgent?: string;
    ipAddress?: string;
};
