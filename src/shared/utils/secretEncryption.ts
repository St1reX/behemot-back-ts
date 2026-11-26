import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { env } from '../../config/env';

const encryptionKey = Buffer.from(env.INTEGRATION_ENCRYPTION_KEY, 'hex');
const keyId = createHash('sha256').update(encryptionKey).digest('hex').slice(0, 16);
const version = 'v1';

// Context binds the secret to its owner and field, preventing ciphertext swaps between accounts.
export function encryptSecret(value: string, context: string): string {
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', encryptionKey, nonce, { authTagLength: 16 });
    cipher.setAAD(Buffer.from(`${version}:${keyId}:${context}`, 'utf8'));
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);

    return [version, keyId, nonce.toString('hex'), cipher.getAuthTag().toString('hex'), ciphertext.toString('hex')].join(':');
}

export function decryptSecret(value: string, context: string): string {
    try {
        const parts = value.split(':');
        const [storedVersion, storedKeyId, nonce, tag, ciphertext] = parts;
        if (
            parts.length !== 5 || storedVersion !== version || storedKeyId !== keyId ||
            !/^[a-f0-9]{24}$/.test(nonce) || !/^[a-f0-9]{32}$/.test(tag) ||
            !/^(?:[a-f0-9]{2})*$/.test(ciphertext)
        ) {
            throw new Error('Invalid encrypted secret format.');
        }

        const decipher = createDecipheriv('aes-256-gcm', encryptionKey, Buffer.from(nonce, 'hex'), { authTagLength: 16 });
        decipher.setAAD(Buffer.from(`${version}:${keyId}:${context}`, 'utf8'));
        decipher.setAuthTag(Buffer.from(tag, 'hex'));
        return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'hex')), decipher.final()]).toString('utf8');
    } catch {
        // Never attach the secret or ciphertext to an error that can reach application logs.
        throw new Error('Nie udało się odszyfrować sekretu. Sprawdź klucz szyfrujący i zgodność danych.');
    }
}
