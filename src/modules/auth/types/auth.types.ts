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

export interface CurrentUserResponse {
    user: AuthenticatedUser;
}

export type LoginUserResponse = CurrentUserResponse;

export interface LogoutUserResponse {
    message: string;
}
