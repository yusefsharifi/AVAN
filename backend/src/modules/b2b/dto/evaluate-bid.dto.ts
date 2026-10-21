import { IsString, IsUUID, IsOptional, IsObject, IsInt, IsBoolean, Min, MinLength, Max } from 'class-validator';

export class EvaluateBidDto {
  @IsUUID()
  bidId: string;

  @IsObject()
  scores: Record<string, number>;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class AwardRfqDto {
  @IsUUID()
  rfqId: string;

  @IsUUID()
  winningBidId: string;

  @IsString()
  @MinLength(10)
  awardNote: string;

  @IsOptional()
  @IsBoolean()
  autoConvertToPO?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyAllBidders?: boolean;

  @IsOptional()
  @IsString()
  rejectionReasonTemplate?: string;
}

export class SubmitBidReviewDto {
  @IsUUID()
  rfqId: string;

  @IsUUID()
  bidId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsInt()
  @Min(1)
  @Max(5)
  deliveryScore: number;

  @IsInt()
  @Min(1)
  @Max(5)
  qualityScore: number;

  @IsInt()
  @Min(1)
  @Max(5)
  communicationScore: number;

  @IsOptional()
  @IsString()
  review?: string;
}
