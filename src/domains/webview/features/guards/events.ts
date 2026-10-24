export function validatePointerEvent(event: Event): asserts event is PointerEvent {
  if (!(event instanceof PointerEvent)) {
    throw new Error('Invalid pointer event');
  }
}
