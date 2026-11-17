export interface CarGenerationResponse {
    id: string;
    startProduction: number;
    endProduction: number | null;
    carModel: {
        id: string;
        name: string;
        carBrand: {
            id: string;
            name: string;
        };
    };
    createdAt: Date;
    updatedAt: Date;
}

export interface DeleteCarGenerationResponse {
    message: string;
}
