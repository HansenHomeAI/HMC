export function applySogsCameraBounds(position, focus, options = {}) {
  const yMin = options.yMin;
  const maxRadius = options.maxRadius;
  const slideFocusAtRadius = options.slideFocusAtRadius !== false;
  const hasY = typeof yMin === "number" && Number.isFinite(yMin);
  const hasRadius = typeof maxRadius === "number" && Number.isFinite(maxRadius) && maxRadius > 0;
  if (!hasY && !hasRadius) {
    return { changed: false, radiusClamped: false };
  }

  const originalX = position.x;
  const originalY = position.y;
  const originalZ = position.z;
  let changed = false;
  let radiusClamped = false;

  for (let i = 0; i < 6; i++) {
    if (hasY) {
      const nextY = Math.max(position.y, yMin);
      if (nextY !== position.y) {
        changed = true;
        position.y = nextY;
      }
    }

    if (hasRadius) {
      const length = Math.hypot(position.x, position.y, position.z);
      if (length > maxRadius && length > 1e-20) {
        const scale = maxRadius / length;
        position.x *= scale;
        position.y *= scale;
        position.z *= scale;
        changed = true;
        radiusClamped = true;
      }
    }
  }

  if (changed && slideFocusAtRadius && radiusClamped) {
    focus.x += position.x - originalX;
    focus.y += position.y - originalY;
    focus.z += position.z - originalZ;
  }

  return { changed, radiusClamped };
}
