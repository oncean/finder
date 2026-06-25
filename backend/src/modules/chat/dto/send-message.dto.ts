import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  SHOP_CARD = 'shop_card',
}

export class SendMessageDto {
  @IsString()
  groupId: string;

  @IsEnum(MessageType)
  type: MessageType;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  shopId?: string;

  @IsOptional()
  shopCard?: {
    shopId: string;
    name: string;
    address: string;
    coverImage: string;
    distance: number;
    summaryTags: any;
    reviewCount: number;
    rating?: number;
  };
}
