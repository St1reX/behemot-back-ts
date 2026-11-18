import { BolmaRepository } from './repositories/bolmaRepository';
import { BolmaStatusResponse } from './types/bolma.types';

export class BolmaService {
    static async getStatus(): Promise<BolmaStatusResponse> {
        try {
            await BolmaRepository.checkDatabaseConnection();

            return { status: 'ok', components: { database: 'ok' } };
        } catch {
            return { status: 'error', components: { database: 'error' } };
        }
    }
}
