import type { Request, Response } from 'express';
import type { AuthService } from '../services/auth.service.js';
import { ok, created } from '../../../shared/http/api-response.js';
import type { LoginDto, RegisterDto } from '../dtos/auth.dto.js';

/**
 * Controllers are deliberately thin: they translate between HTTP and the service
 * layer and nothing more. Validation already happened in middleware, business
 * rules live in the service, so each handler just calls the service and shapes the
 * response. Handlers are arrow properties so they keep their `this` binding when
 * passed directly as Express route handlers.
 */
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const user = await this.authService.register(req.body as RegisterDto);
    created(res, user);
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const result = await this.authService.login(req.body as LoginDto);
    ok(res, result);
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const tokens = await this.authService.refresh(req.body.refreshToken);
    ok(res, tokens);
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    await this.authService.logout(req.body.refreshToken);
    ok(res, { message: 'Logged out' });
  };
}
