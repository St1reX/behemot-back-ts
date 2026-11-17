import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
   requestId: string;
   sourceIp?: string;
   userId?: string;
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function getRequestContext() {
   return requestContextStorage.getStore();
}
