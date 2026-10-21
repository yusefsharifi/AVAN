import { BadRequestException, Logger } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { normalizeDateToIso } from '../utils/date-normalize';

const logger = new Logger('IsoDate');

/**
 * `@IsoDate()` — DTO field decorator for dates that travel as ISO-8601
 * (fix4.md Task 5).
 *
 * Behaviour:
 *   - canonical `YYYY-MM-DD` passes through untouched;
 *   - legacy Jalali / `YYYY/MM/DD` / Persian digits are accepted and converted,
 *     with a deprecation warning logged so the originating caller can be fixed;
 *   - anything unparseable throws `BadRequestException` instead of letting the
 *     string through, which is how `hireDate` previously ended up holding the
 *     literal `امروز` and later feeding `new Date()` an `Invalid Date`.
 *
 * Absent (`undefined`/`null`) and blank values are returned unchanged so that
 * `@IsOptional()` / `@IsString()` keep owning required-ness — this decorator
 * only polices the *shape* of a value that was actually supplied.
 *
 * Use it alongside `@IsString()`; it is not a validator itself.
 */
export function IsoDate(options: { field?: string } = {}): PropertyDecorator {
  const field = options.field ?? 'date';

  return Transform(({ value, key }) => {
    if (value === undefined || value === null) return value;

    const raw = typeof value === 'string' ? value.trim() : '';
    if (raw === '') return value;

    const normalized = normalizeDateToIso(raw);

    if (!normalized.ok) {
      throw new BadRequestException(
        `مقدار ${options.field ?? key ?? field} یک تاریخ معتبر نیست. ` +
          `قالب مورد انتظار YYYY-MM-DD میلادی (یا شمسی با همان قالب) است. مقدار دریافتی: «${raw}»`,
      );
    }

    if (!normalized.wasIso) {
      logger.warn(
        `DEPRECATED non-ISO date on "${options.field ?? key ?? field}": ` +
          `"${raw}" accepted as ${normalized.iso}. Send ISO-8601 YYYY-MM-DD on the wire.`,
      );
    }

    return normalized.iso;
  });
}
