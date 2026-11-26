export interface ConnectionCheckResult {
    externalAccountId: string | null;
    externalUsername: string | null;
}

// A successful check returns account identification; a failed check throws an error.
export interface MarketplaceAdapter {
    checkConnection(): Promise<ConnectionCheckResult>;
}
