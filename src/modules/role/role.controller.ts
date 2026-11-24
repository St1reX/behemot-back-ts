import { NextFunction, Request, Response } from 'express';
import { RoleService } from './role.service';
import {
    CreateRoleSchema,
    UpdateRoleSchema,
    RoleIdSchema,
    UpdateRolePrivilegesSchema,
} from './schemas/role.schema';
import { DeleteRoleResponse, PrivilegeResponse, RoleDetailsResponse, RoleResponse } from './types/role.types';

export class RoleController {
    static async getPrivileges(
        req: Request,
        res: Response<PrivilegeResponse[]>,
        next: NextFunction,
    ) {
        try {
            const result = await RoleService.getPrivileges();

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async getRoles(req: Request, res: Response<RoleResponse[]>, next: NextFunction) {
        try {
            const result = await RoleService.getRoles();

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async getRole(req: Request, res: Response<RoleDetailsResponse>, next: NextFunction) {
        try {
            const { id: roleId } = RoleIdSchema.parse(req.params);

            const result = await RoleService.getRole(roleId);

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async createRole(req: Request, res: Response<RoleDetailsResponse>, next: NextFunction) {
        try {
            const validatedData = CreateRoleSchema.parse(req.body);

            const result = await RoleService.createRole(validatedData);

            res.status(201).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async updateRole(req: Request, res: Response<RoleDetailsResponse>, next: NextFunction) {
        try {
            const { id: roleId } = RoleIdSchema.parse(req.params);
            const validatedData = UpdateRoleSchema.parse(req.body);

            const result = await RoleService.updateRole(roleId, validatedData);

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async deleteRole(req: Request, res: Response<DeleteRoleResponse>, next: NextFunction) {
        try {
            const { id: roleId } = RoleIdSchema.parse(req.params);

            const result = await RoleService.deleteRole(roleId);

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async grantPrivileges(
        req: Request,
        res: Response<RoleResponse>,
        next: NextFunction,
    ) {
        try {
            const { id: roleId } = RoleIdSchema.parse(req.params);
            const validatedData = UpdateRolePrivilegesSchema.parse(req.body);

            const result = await RoleService.grantPrivileges(roleId, validatedData);

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async revokePrivileges(
        req: Request,
        res: Response<RoleResponse>,
        next: NextFunction,
    ) {
        try {
            const { id: roleId } = RoleIdSchema.parse(req.params);
            const validatedData = UpdateRolePrivilegesSchema.parse(req.body);

            const result = await RoleService.revokePrivileges(roleId, validatedData);

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }
}
