import type { Dimension } from '@features/image/imageDecoder/imagePreparation/types';
import { StringTemplate } from '@utils/string/StringTemplate';

const AUTO_LABEL = 'auto';
const SIZE_TEMPLATE = new StringTemplate('{{width}} × {{height}}', ['width', 'height'] as const);
const CUSTOM_TEMPLATE = new StringTemplate('{{size}} — yours', ['size'] as const);

function formatSize({ width, height }: Dimension): string {
  return SIZE_TEMPLATE.render({ width: String(width), height: String(height) });
}

export const DIMENSION_LABELS = {
  auto: (): string => AUTO_LABEL,
  guess: formatSize,
  custom: (dimension: Dimension): string => CUSTOM_TEMPLATE.render({ size: formatSize(dimension) }),
};
