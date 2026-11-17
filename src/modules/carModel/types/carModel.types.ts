export interface CarModelResponse {
    id: string;
    name: string;
    carBrand: {
        id: string;
        name: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

export interface DeleteCarModelResponse {
    message: string;
}
