import { throwAllegroError } from './allegro.errors';
import { parseAllegroResponse } from './allegro.response';
import { AllegroUserSchema } from './allegro.schema';

export class AllegroApiClient {
    static async getUser(baseUrl: string, accessToken: string) {
        try {
            const response = await fetch(new URL('me', baseUrl), {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/vnd.allegro.public.v1+json',
                    'User-Agent': 'Behemot/1.0',
                },
                signal: AbortSignal.timeout(10_000),
                redirect: 'error',
            });
            return await parseAllegroResponse(response, AllegroUserSchema);
        } catch (error) {
            throwAllegroError(error);
        }
    }
}
