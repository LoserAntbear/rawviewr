import { BYTE_GRADES, BYTE_STEP, ByteConverter, type ByteGrade } from '@utils/bits';

/**
 * Raw bytes have no need for decimal precision.
 * While larger grades may need decimal precision to distinguish neighbouring values.
 */
const BYTE_PRECISION: Partial<Record<ByteGrade, number>> & { DEFAULT: number } = {
  B: 0,
  KiB: 1,
  DEFAULT: 2,
};

function precisionFor(grade: ByteGrade): number {
  return BYTE_PRECISION[grade] ?? BYTE_PRECISION.DEFAULT;
}

function render(grade: ByteGrade, bytes: number): string {
  return `${ByteConverter.to(grade, bytes).toFixed(precisionFor(grade))} ${grade}`;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes)) {
    return '-/-';
  }

  const grade = ByteConverter.gradeFor(bytes);

  /**
   * Rounding can carry a value up into the next grade. 1048575 B is 1023.9995 KiB, which
   * `gradeFor` correctly keeps in KiB — but printed to one decimal it reads "1024.0 KiB"
   * instead of "1.00 MiB".
   */
  const rounded = Number(ByteConverter.to(grade, bytes).toFixed(precisionFor(grade)));
  const promoted = BYTE_GRADES[BYTE_GRADES.indexOf(grade) + 1];
  const renderValue = Math.abs(rounded) >= BYTE_STEP && promoted
    ? promoted
    : grade;

  return render(renderValue, bytes);
}

export const StringFormat = {
  bytes: formatBytes,
};
