import { Router } from 'express';
import { authService } from '../services/auth.service.js';
import { loginSchema, registerSchema } from '../validators/auth.validator.js';
import { BadRequestError } from '../../../shared/errors/api-error.js';

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) throw new BadRequestError('Validation failed');
  const data = await authService.register(
    result.data.email,
    result.data.password,
  );
  res.json({ success: true, data });
});

authRouter.post('/login', async (req, res) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) throw new BadRequestError('Validation failed');
  const data = await authService.login(result.data.email, result.data.password);
  res.json({ success: true, data });
});

authRouter.post('/refresh', async (req, res) => {
  const token = req.body?.refreshToken as string;
  if (!token) throw new BadRequestError('Missing refresh token');
  const data = await authService.refresh(token);
  res.json({ success: true, data });
});

authRouter.post('/logout', async (req, res) => {
  const token = req.body?.refreshToken as string;
  if (!token) throw new BadRequestError('Missing refresh token');
  await authService.logout(token);
  res.json({ success: true, data: {} });
});
