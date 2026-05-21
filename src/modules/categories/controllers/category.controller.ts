import { Router } from 'express';

export const categoryRouter = Router();

categoryRouter.get('/', (_req, res) => {
  res.json({ success: true, data: [] });
});
