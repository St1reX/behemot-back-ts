import { OperationStatus } from '@prisma/client';
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { AppError, ErrorNames } from '../../errors/errorHandler';
import { createAuditLog } from '../../infrastructure/audit/auditLogger';
import { getRequestContext } from '../../infrastructure/requestContext/requestContext';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { DepartmentRepository } from '../department/repositories/departmentRepository';
import { RoleRepository } from '../role/repositories/roleRepository';
import { UserRepository } from './repositories/userRepository';
import { CreateUserDTO, UpdateUserDTO } from './schemas/user.schema';

const scryptAsync = promisify(scrypt);

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
        const [roles, departments] = await Promise.all([
            RoleRepository.findAll(),
            DepartmentRepository.findAll(),
        ]);
        return {
            roles: roles.map(({ id, name }) => ({ id, name })),
            departments: departments.map(({ id, name }) => ({ id, name })),
        };
    }

    static async createUser({ password, ...data }: CreateUserDTO) {
        await this.validateData(data);
        const salt = randomBytes(16).toString('hex');
        const hash = (await scryptAsync(password, salt, 64)) as Buffer;
        const user = await UserRepository.create({ ...data, passwordHash: `${salt}:${hash.toString('hex')}` });
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
        if (!await RoleRepository.findById(data.roleId)) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Nie znaleziono wybranej roli.');
        }
        if (data.departmentId && !await DepartmentRepository.findById(data.departmentId)) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Nie znaleziono wybranego działu.');
        }
    }
}
