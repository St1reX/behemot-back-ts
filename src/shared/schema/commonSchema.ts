import { z } from 'zod';

export const UuidSchema = z.string().uuid();
export const IdParamsSchema = z.object({ id: UuidSchema });

export const UsernameSchema = z.string()
    .min(3, 'Nazwa użytkownika musi mieć co najmniej 3 znaki.')
    .max(25, 'Nazwa użytkownika może mieć najwyżej 25 znaków.');
export const PasswordSchema = z.string().min(8, 'Hasło musi mieć co najmniej 8 znaków.');
export const EmailSchema = z.string().email();
