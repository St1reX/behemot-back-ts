export interface DepartmentResponse {
    id: string;
    name: string;
    shortcut: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface DeleteDepartmentResponse {
    message: string;
}
