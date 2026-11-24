import { OperationStatus } from '@prisma/client';
import { AppError, ErrorNames } from '../../errors/errorHandler';
import { createAuditLog } from '../../infrastructure/audit/auditLogger';
import { getRequestContext } from '../../infrastructure/requestContext/requestContext';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { RoleRepository } from '../role/repositories/roleRepository';
import { hashPassword } from '../auth/utils/hashPassword';
import { UserRepository } from './repositories/userRepository';
import { CreateUserDTO, UpdateUserDTO } from './schemas/user.schema';

export class UserService {
    static getUsers() {
        return UserRepository.findAll();
    }

    static async getUser(id: string) {
        const user = await UserRepository.findById(id);
        if (!user) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Nie znaleziono użytkownika.');
        }
        return user;
    }

    static async getFormOptions() {
        const roles = await RoleRepository.findAll();
        return {
            roles: roles.map(({ id, name }) => ({ id, name })),
        };
    }

    static async createUser({ password, ...data }: CreateUserDTO) {
        await this.validateData(data);
        const passwordHash = await hashPassword(password);
        const user = await UserRepository.create({ ...data, passwordHash });
        await createAuditLog({
            entityName: ENTITIES.USER, entityId: user.id, action: ACTIONS.CREATE,
            operationStatus: OperationStatus.SUCCESS, dataBefore: null, dataAfter: user,
        });
        return user;
    }

    static async updateUser(id: string, data: UpdateUserDTO) {
        const existing = await this.getUser(id);
        if (id === getRequestContext()?.userId && (data.roleId !== existing.roleId || !data.isActive)) {
            throw new AppError(ErrorNames.FORBIDDEN, 403, 'Nie możesz zmienić własnej roli ani dezaktywować własnego konta.');
        }
        await this.validateData(data, id);
        const user = await UserRepository.update(
            id, data, data.isActive !== existing.isActive || data.email !== existing.email || !data.isActive,
        );
        await createAuditLog({
            entityName: ENTITIES.USER, entityId: id, action: ACTIONS.UPDATE,
            operationStatus: OperationStatus.SUCCESS, dataBefore: existing, dataAfter: user,
        });
        return user;
    }

    static async deleteUser(id: string) {
        const existing = await this.getUser(id);
        if (id === getRequestContext()?.userId) {
            throw new AppError(ErrorNames.FORBIDDEN, 403, 'Nie możesz usunąć własnego konta.');
        }
        await UserRepository.softDelete(id);
        await createAuditLog({
            entityName: ENTITIES.USER, entityId: id, action: ACTIONS.DELETE,
            operationStatus: OperationStatus.SUCCESS, dataBefore: existing, dataAfter: null,
        });
        return { message: 'Użytkownik został usunięty.' };
    }

    private static async validateData(data: UpdateUserDTO, excludedId?: string) {
        if (await UserRepository.findConflict(data, excludedId)) {
            throw new AppError(ErrorNames.CONFLICT, 409, 'Adres e-mail lub nazwa użytkownika są już zajęte.');
        }
        if (!await RoleRepository.existsById(data.roleId)) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Nie znaleziono wybranej roli.');
        }
    }
}
