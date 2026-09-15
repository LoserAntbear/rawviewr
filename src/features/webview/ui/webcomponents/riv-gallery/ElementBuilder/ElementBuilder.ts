import { RIVTags } from '../../definitions';
import type { RIVImage } from '../../riv-image';

export class ElementBuilder {
  public static buildEntry(itemId: string): HTMLLIElement {
    const entry = document.createElement('li');
    const image = document.createElement(RIVTags.Image) as RIVImage;

    image.itemId = itemId;

    // Add item id to the event payload
    entry.dataset.itemId = itemId;
    entry.appendChild(image);

    return entry;
  }
}
