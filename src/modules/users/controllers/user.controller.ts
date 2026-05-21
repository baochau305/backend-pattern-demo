import { Router } from 'express';

export const userRouter = Router();

userRouter.get('/', (_req, res) => {
  res.json({ success: true, data: [] });
});
