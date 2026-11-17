interface CarGenerationData {
    startProduction: number;
    endProduction: number | null;
    carModel: {
        name: string;
        carBrand: {
            name: string;
        };
    };
}

export function formatCarGeneration(carGeneration: CarGenerationData): string {
    const productionYears = carGeneration.endProduction
        ? `${carGeneration.startProduction}-${carGeneration.endProduction}`
        : `${carGeneration.startProduction}-`;

    return `${carGeneration.carModel.carBrand.name} ${carGeneration.carModel.name} ${productionYears}`;
}
