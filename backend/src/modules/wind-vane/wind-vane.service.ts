import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WindVane } from '../../entities/wind-vane.entity';
import { Comment } from '../../entities/comment.entity';
import { Shop } from '../../entities/shop.entity';

@Injectable()
export class WindVaneService {
  constructor(
    @InjectRepository(WindVane)
    private windVaneRepository: Repository<WindVane>,
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
  ) {}

  async findAll(): Promise<WindVane[]> {
    return this.windVaneRepository.find({
      where: { isActive: true },
      order: { ranking: 'ASC' },
      relations: ['review', 'review.shop'],
    });
  }

  async findById(id: string): Promise<WindVane | null> {
    return this.windVaneRepository.findOne({
      where: { id },
      relations: ['review', 'review.shop'],
    });
  }

  async create(reviewId: string, ranking: number, featuredTag?: string): Promise<WindVane> {
    const comment = await this.commentRepository.findOne({
      where: { id: reviewId },
      relations: ['shop'],
    });

    if (!comment) {
      throw new Error('评论不存在');
    }

    const existing = await this.windVaneRepository.findOne({
      where: { reviewId },
    });

    if (existing) {
      throw new Error('该评论已在风向标中');
    }

    const windVane = this.windVaneRepository.create({
      reviewId,
      ranking,
      featuredTag,
    });

    return this.windVaneRepository.save(windVane);
  }

  async update(id: string, data: Partial<WindVane>): Promise<WindVane | null> {
    const windVane = await this.windVaneRepository.findOne({ where: { id } });

    if (!windVane) {
      return null;
    }

    Object.assign(windVane, data);
    return this.windVaneRepository.save(windVane);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.windVaneRepository.delete(id);
    return result.affected > 0;
  }

  async updateRanking(id: string, newRanking: number): Promise<WindVane | null> {
    const windVane = await this.windVaneRepository.findOne({ where: { id } });

    if (!windVane) {
      return null;
    }

    const oldRanking = windVane.ranking;
    windVane.ranking = newRanking;

    if (newRanking < oldRanking) {
      await this.windVaneRepository
        .createQueryBuilder()
        .update(WindVane)
        .set({ ranking: () => 'ranking + 1' })
        .where('ranking >= :newRanking AND ranking < :oldRanking', {
          newRanking,
          oldRanking,
        })
        .execute();
    } else if (newRanking > oldRanking) {
      await this.windVaneRepository
        .createQueryBuilder()
        .update(WindVane)
        .set({ ranking: () => 'ranking - 1' })
        .where('ranking > :oldRanking AND ranking <= :newRanking', {
          oldRanking,
          newRanking,
        })
        .execute();
    }

    return this.windVaneRepository.save(windVane);
  }

  async getAvailableComments(): Promise<Comment[]> {
    const windVaneReviewIds = await this.windVaneRepository
      .createQueryBuilder('wv')
      .select('wv.review_id')
      .getRawMany();

    const usedIds = windVaneReviewIds.map((item) => item.wv_review_id);

    if (usedIds.length === 0) {
      return this.commentRepository.find({
        relations: ['shop'],
      });
    }

    return this.commentRepository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.shop', 'shop')
      .where('comment.id NOT IN (:...ids)', { ids: usedIds })
      .getMany();
  }
}
