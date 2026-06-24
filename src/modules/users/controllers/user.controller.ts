import type { Request, Response } from 'express';
import type { UserService } from '../services/user.service.js';
import { ok, created, paginated } from '../../../shared/http/api-response.js';
import type { CreateUserDto, UpdateUserDto } from '../dtos/user.dto.js';
import type { PaginationQuery } from '../../../shared/validators/common.validator.js';

export class UserController {
  constructor(private readonly userService: UserService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const { page, limit } = req.query as unknown as PaginationQuery;
    const result = await this.userService.list({ page, limit });
    paginated(res, result);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const user = await this.userService.getById(req.params.id);
    ok(res, user);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const user = await this.userService.create(req.body as CreateUserDto);
    created(res, user);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const user = await this.userService.update(
      req.params.id,
      req.body as UpdateUserDto,
    );
    ok(res, user);
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await this.userService.remove(req.params.id);
    ok(res, { message: 'User deleted' });
  };
}
