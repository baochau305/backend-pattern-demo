import type { Request, Response } from 'express';
import type { CategoryService } from '../services/category.service.js';
import { ok, created, paginated } from '../../../shared/http/api-response.js';
import type {
  CreateCategoryDto,
  UpdateCategoryDto,
} from '../dtos/category.dto.js';
import type { PaginationQuery } from '../../../shared/validators/common.validator.js';

export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const { page, limit } = req.query as unknown as PaginationQuery;
    paginated(res, await this.categoryService.list({ page, limit }));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    ok(res, await this.categoryService.getById(req.params.id));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    created(
      res,
      await this.categoryService.create(req.body as CreateCategoryDto),
    );
  };

  update = async (req: Request, res: Response): Promise<void> => {
    ok(
      res,
      await this.categoryService.update(
        req.params.id,
        req.body as UpdateCategoryDto,
      ),
    );
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await this.categoryService.remove(req.params.id);
    ok(res, { message: 'Category deleted' });
  };
}
