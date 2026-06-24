import type { Request, Response } from 'express';
import type { ProductService } from '../services/product.service.js';
import { ok, created, paginated } from '../../../shared/http/api-response.js';
import type {
  CreateProductDto,
  UpdateProductDto,
} from '../dtos/product.dto.js';
import type { ListProductQuery } from '../validators/product.validator.js';

export class ProductController {
  constructor(private readonly productService: ProductService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const q = req.query as unknown as ListProductQuery;
    const result = await this.productService.list({
      page: q.page,
      limit: q.limit,
      search: q.search,
      categoryId: q.category,
      sort: q.sort,
    });
    paginated(res, result);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    ok(res, await this.productService.getById(req.params.id));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    created(
      res,
      await this.productService.create(req.body as CreateProductDto),
    );
  };

  update = async (req: Request, res: Response): Promise<void> => {
    ok(
      res,
      await this.productService.update(
        req.params.id,
        req.body as UpdateProductDto,
      ),
    );
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await this.productService.remove(req.params.id);
    ok(res, { message: 'Product deleted' });
  };
}
