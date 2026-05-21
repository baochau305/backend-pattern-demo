import { dataSource } from '../../../shared/database/data-source.js';
import { RefreshToken } from '../entities/refresh-token.entity.js';
import { User } from '../../users/entities/user.entity.js';

export const authRepo = {
  userRepo: dataSource.getRepository(User),
  refreshRepo: dataSource.getRepository(RefreshToken),
};
