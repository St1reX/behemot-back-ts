export interface BolmaStatusResponse {
    status: 'ok' | 'error';
    components: {
        database: 'ok' | 'error';
    };
}
