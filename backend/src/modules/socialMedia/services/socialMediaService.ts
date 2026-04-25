import pool from '@config/database';
import { SocialMediaRepository } from '../repositories/socialMedia.repository';
import { SocialMediaUseCase } from '../usecases/socialMedia.usecase';
import { FacebookGraphClient } from './facebookGraphClient';

export const createSocialMediaService = () =>
  new SocialMediaUseCase(new SocialMediaRepository(pool), new FacebookGraphClient());

export const socialMediaService = createSocialMediaService();
