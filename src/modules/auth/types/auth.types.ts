export interface RegisteredUserResponse {
    id: string;
    email: string;
    username: string;
    profilePictureUrl: string | null;
    role: {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    };
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface ResendRegistrationMailResponse {
    message: string;
}

export interface VerifyAccountResponse {
    message: string;
}

export interface AuthenticatedUser {
    id: string;
    email: string;
    username: string;
    profilePictureUrl: string | null;
    role: {
        id: string;
        name: string;
        privileges: {
            id: string;
            name: string;
        }[];
    };
    isActive: boolean;
}

export interface LoginUserResponse {
    user: AuthenticatedUser;
}

export interface LogoutUserResponse {
    message: string;
}
