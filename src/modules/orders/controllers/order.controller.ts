import type { Request, Response } from 'express';
import type { OrderService } from '../services/order.service.js';
import { ok, created, paginated } from '../../../shared/http/api-response.js';
import { Role } from '../../../shared/constants/roles.js';
import { UnauthorizedError } from '../../../shared/errors/api-error.js';
import type { CreateOrderDto } from '../dtos/order.dto.js';
import type { ListOrderQuery } from '../validators/order.validator.js';

/**
 * Order endpoints enforce ownership-based authorization: a USER only ever sees
 * their own orders, while an ADMIN sees everything. The branching lives here (the
 * HTTP/identity boundary); the service exposes distinct, intention-revealing
 * methods rather than a flag.
 */
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  private userId(req: Request): string {
    if (!req.user) throw new UnauthorizedError();
    return req.user.id;
  }

  create = async (req: Request, res: Response): Promise<void> => {
    const idempotencyKey = req.header('Idempotency-Key') ?? undefined;
    const order = await this.orderService.create(
      this.userId(req),
      req.body as CreateOrderDto,
      idempotencyKey,
    );
    created(res, order);
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const { page, limit } = req.query as unknown as ListOrderQuery;
    const result =
      req.user?.role === Role.ADMIN
        ? await this.orderService.listAll({ page, limit })
        : await this.orderService.listForUser(this.userId(req), {
            page,
            limit,
          });
    paginated(res, result);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const order =
      req.user?.role === Role.ADMIN
        ? await this.orderService.getByIdAsAdmin(req.params.id)
        : await this.orderService.getByIdForUser(
            req.params.id,
            this.userId(req),
          );
    ok(res, order);
  };
}
