export const INTEGRATION_CHANNELS = {
    ALLEGRO: 'ALLEGRO',
    BASELINKER: 'BASELINKER',
    PRESTASHOP: 'PRESTASHOP',
} as const;

export type IntegrationChannel =
    (typeof INTEGRATION_CHANNELS)[keyof typeof INTEGRATION_CHANNELS];
