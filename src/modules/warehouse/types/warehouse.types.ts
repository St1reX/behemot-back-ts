export interface WarehouseResponse {
    id: string;
    name: string;
    postalCode: string;
    city: string;
    street: string;
    buildingNumber: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface DeleteWarehouseResponse {
    message: string;
}
