export interface PrivilegeResponse {
    id: string;
    name: string;
}

export interface RoleResponse {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface RoleDetailsResponse {
    id: string;
    name: string;
    privileges: PrivilegeResponse[];
    createdAt: Date;
    updatedAt: Date;
}

export interface DeleteRoleResponse {
    message: string;
}
