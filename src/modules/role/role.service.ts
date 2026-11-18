import { OperationStatus } from '@prisma/client';
import { AppError, ErrorNames } from '../../errors/errorHandler';
import { createAuditLog } from '../../infrastructure/audit/auditLogger';
import { getRequestContext } from '../../infrastructure/requestContext/requestContext';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { RoleRepository } from './repositories/roleRepository';
import { CreateRoleDTO, UpdateRolePrivilegesDTO } from './schemas/role.schema';
import {
    DeleteRoleResponse,
    PrivilegeResponse,
    RoleDetailsResponse,
    RoleResponse,
} from './types/role.types';

export class RoleService {
    static async getPrivileges(): Promise<PrivilegeResponse[]> {
        return RoleRepository.findPrivileges();
    }

    static async getRoles(): Promise<RoleResponse[]> {
        return RoleRepository.findAll();
    }

    static async getRole(roleId: string): Promise<RoleDetailsResponse> {
        const role = await RoleRepository.findById(roleId);

        if (!role) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Role not found');
        }

        return role;
    }

    static async createRole(roleData: CreateRoleDTO): Promise<RoleResponse> {
        await this.ensureRoleNameIsAvailable(roleData.name);

        const createdRole = await RoleRepository.create(roleData);

        await createAuditLog({
            entityName: ENTITIES.ROLE,
            entityId: createdRole.id,
            action: ACTIONS.CREATE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: null,
            dataAfter: createdRole,
        });

        return createdRole;
    }

    static async deleteRole(roleId: string): Promise<DeleteRoleResponse> {
        const existingRole = await this.getRole(roleId);

        const assignedUsersCount = await RoleRepository.countAssignedUsers(roleId);

        if (assignedUsersCount > 0) {
            throw new AppError(
                ErrorNames.CONFLICT,
                409,
                'Role cannot be deleted because it is assigned to a user',
            );
        }

        await RoleRepository.softDelete(roleId);

        await createAuditLog({
            entityName: ENTITIES.ROLE,
            entityId: roleId,
            action: ACTIONS.DELETE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: existingRole,
            dataAfter: null,
        });

        return {
            message: 'Role has been deleted successfully',
        };
    }

    static async grantPrivileges(
        roleId: string,
        privilegesData: UpdateRolePrivilegesDTO,
    ): Promise<RoleResponse> {
        await this.ensureRoleCanBeModified(roleId);

        const existingRole = await this.getRole(roleId);
        const privilegeIds = await this.getActivePrivilegeIds(privilegesData.privilegeIds);
        const assignedPrivilegeIds = new Set(
            existingRole.privileges.map((privilege) => privilege.id),
        );
        const privilegeIdsToGrant = privilegeIds.filter(
            (privilegeId) => !assignedPrivilegeIds.has(privilegeId),
        );

        if (privilegeIdsToGrant.length === 0) {
            return existingRole;
        }

        const updatedRole = await RoleRepository.grantPrivileges(roleId, privilegeIdsToGrant);

        await createAuditLog({
            entityName: ENTITIES.ROLE,
            entityId: roleId,
            action: ACTIONS.UPDATE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: existingRole,
            dataAfter: updatedRole,
        });

        return updatedRole;
    }

    static async revokePrivileges(
        roleId: string,
        privilegesData: UpdateRolePrivilegesDTO,
    ): Promise<RoleResponse> {
        await this.ensureRoleCanBeModified(roleId);

        const existingRole = await this.getRole(roleId);
        const privilegeIds = await this.getActivePrivilegeIds(privilegesData.privilegeIds);
        const assignedPrivilegeIds = new Set(
            existingRole.privileges.map((privilege) => privilege.id),
        );
        const privilegeIdsToRevoke = privilegeIds.filter((privilegeId) =>
            assignedPrivilegeIds.has(privilegeId),
        );

        if (privilegeIdsToRevoke.length === 0) {
            return existingRole;
        }

        const updatedRole = await RoleRepository.revokePrivileges(roleId, privilegeIdsToRevoke);

        await createAuditLog({
            entityName: ENTITIES.ROLE,
            entityId: roleId,
            action: ACTIONS.UPDATE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: existingRole,
            dataAfter: updatedRole,
        });

        return updatedRole;
    }

    private static async getActivePrivilegeIds(privilegeIds: string[]): Promise<string[]> {
        const uniquePrivilegeIds = [...new Set(privilegeIds)];
        const activePrivileges = await RoleRepository.findActivePrivileges(uniquePrivilegeIds);

        if (activePrivileges.length !== uniquePrivilegeIds.length) {
            throw new AppError(
                ErrorNames.RESOURCE_NOT_FOUND,
                404,
                'One or more privileges were not found',
            );
        }

        return uniquePrivilegeIds;
    }

    private static async ensureRoleNameIsAvailable(roleName: string) {
        const existingRole = await RoleRepository.findByName(roleName);

        if (existingRole) {
            throw new AppError(ErrorNames.CONFLICT, 409, 'Role name is already in use');
        }
    }

    private static async ensureRoleCanBeModified(roleId: string) {
        const userId = getRequestContext()?.userId;

        if (!userId) {
            throw new AppError(ErrorNames.AUTHENTICATION_ERROR, 401, 'User not authenticated');
        }

        const user = await RoleRepository.findActiveUserRole(userId);

        if (!user) {
            throw new AppError(ErrorNames.AUTHENTICATION_ERROR, 401, 'User not authenticated');
        }

        if (user.roleId === roleId) {
            throw new AppError(
                ErrorNames.FORBIDDEN,
                403,
                'You cannot modify privileges assigned to your own role',
            );
        }
    }
}
