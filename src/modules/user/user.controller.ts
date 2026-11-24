import { NextFunction, Request, Response } from 'express';
import { CreateUserSchema, UpdateUserSchema, UserIdSchema } from './schemas/user.schema';
import { UserService } from './user.service';

export class UserController {
    static async getUsers(req: Request, res: Response, next: NextFunction) {
        try {
            res.status(200).json(await UserService.getUsers());
        } catch (error) { next(error); }
    }

    static async getFormOptions(req: Request, res: Response, next: NextFunction) {
        try {
            res.status(200).json(await UserService.getFormOptions());
        } catch (error) { next(error); }
    }

    static async getUser(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = UserIdSchema.parse(req.params);
            res.status(200).json(await UserService.getUser(id));
        } catch (error) { next(error); }
    }

    static async createUser(req: Request, res: Response, next: NextFunction) {
        try {
            const data = CreateUserSchema.parse(req.body);
            res.status(201).json(await UserService.createUser(data));
        } catch (error) { next(error); }
    }

    static async updateUser(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = UserIdSchema.parse(req.params);
            const data = UpdateUserSchema.parse(req.body);
            res.status(200).json(await UserService.updateUser(id, data));
        } catch (error) { next(error); }
    }

    static async deleteUser(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = UserIdSchema.parse(req.params);
            res.status(200).json(await UserService.deleteUser(id));
        } catch (error) { next(error); }
    }
}
