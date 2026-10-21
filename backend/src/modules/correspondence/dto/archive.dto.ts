// ═══════════════════════════════════════════════════════════════════════════════
// M7: Physical Archive DTOs
// ═══════════════════════════════════════════════════════════════════════════════
//
// BUG-PERSIST-007: every class below previously declared plain properties with
// NO class-validator decorators. The global ValidationPipe runs with
// `whitelist: true, forbidNonWhitelisted: true`, so a property only survives
// when it carries at least one decorator — meaning ALL of these fields were
// rejected as "property X should not exist" and no shelf/letter could ever be
// created or moved through the API (POST /physical-archive/shelves returned 400
// for every well-formed payload). They are now fully decorated, mirroring the
// fix applied to create-letter.dto.ts.

import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateShelfDto {
  /** Human/system code of the shelf, unique per zone ([zoneId, shelfCode]). */
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  shelfCode: string;

  /** Persian display label shown in the archive UI. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nameFa: string;

  /** Total slots; defaults to 50 in the schema when omitted. */
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  /** Free-text physical location (aisle/rack note). */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;
}

export class ReceivePhysicalLetterDto {
  /** Unique physical barcode (unique column on PhysicalLetterRecord). */
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  barcode: string;

  /** Target shelf. */
  @IsUUID()
  shelfId: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class MovePhysicalLetterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  barcode: string;

  @IsUUID()
  toShelfId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

export class VerifyLetterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  qrHash: string;
}
