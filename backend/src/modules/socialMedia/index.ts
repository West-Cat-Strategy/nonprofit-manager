import pool from '@config/database';
import { FacebookGraphClient } from './services/facebookGraphClient';
import { SocialMediaRepository } from './repositories/socialMedia.repository';
import { SocialMediaUseCase } from './usecases/socialMedia.usecase';

export * from './routes';

export const createSocialMediaService = () =>
  new SocialMediaUseCase(new SocialMediaRepository(pool), new FacebookGraphClient());

export const socialMediaService = createSocialMediaService();
