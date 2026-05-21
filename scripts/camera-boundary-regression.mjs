import { readFileSync } from "node:fs";
import { applySogsCameraBounds } from "../supersplat-viewer/camera-bounds.mjs";

const bridgeSource = readFileSync(new URL("../supersplat-viewer/sogs-bridge.mjs", import.meta.url), "utf8");
const epsilon = 1e-9;

function assertClose(actual, expected, message) {
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

if (!bridgeSource.includes("function clampSogsCameraPosition(cameraManager, options = {})")) {
  throw new Error("Camera boundary clamp should accept behavior options for scripted vs manual camera modes.");
}

if (!bridgeSource.includes("clampSogsCameraPosition(cameraManager, { slideFocusAtRadius: false });")) {
  throw new Error("Scripted camera bounds should keep authored look-at targets exact.");
}

if (!bridgeSource.includes("if (clampSogsCameraPosition(cameraManager) && typeof cameraManager.syncOrbitFromCurrentCamera === \"function\")")) {
  throw new Error("Manual orbit updates should use the sliding default and resync the orbit controller.");
}

const manualEye = { x: 12, y: 0, z: 5 };
const manualFocus = { x: 9, y: 1, z: 3 };
const originalOffset = {
  x: manualFocus.x - manualEye.x,
  y: manualFocus.y - manualEye.y,
  z: manualFocus.z - manualEye.z,
};
const manualResult = applySogsCameraBounds(manualEye, manualFocus, { maxRadius: 10 });
if (!manualResult.changed || !manualResult.radiusClamped) {
  throw new Error("Manual boundary case should clamp the camera eye at max radius.");
}
assertClose(Math.hypot(manualEye.x, manualEye.y, manualEye.z), 10, "Manual eye should land on the max radius");
assertClose(manualFocus.x - manualEye.x, originalOffset.x, "Manual focus should slide with clamped eye on X");
assertClose(manualFocus.y - manualEye.y, originalOffset.y, "Manual focus should slide with clamped eye on Y");
assertClose(manualFocus.z - manualEye.z, originalOffset.z, "Manual focus should slide with clamped eye on Z");

const scriptedEye = { x: 12, y: 0, z: 5 };
const scriptedFocus = { x: 9, y: 1, z: 3 };
applySogsCameraBounds(scriptedEye, scriptedFocus, { maxRadius: 10, slideFocusAtRadius: false });
assertClose(scriptedFocus.x, 9, "Scripted focus X should stay authored");
assertClose(scriptedFocus.y, 1, "Scripted focus Y should stay authored");
assertClose(scriptedFocus.z, 3, "Scripted focus Z should stay authored");

const floorEye = { x: 1, y: -5, z: 1 };
const floorFocus = { x: 1, y: 0, z: 0 };
const floorResult = applySogsCameraBounds(floorEye, floorFocus, { yMin: -1 });
if (!floorResult.changed || floorResult.radiusClamped) {
  throw new Error("Y-floor-only boundary should clamp height without treating it as a radius edge.");
}
assertClose(floorEye.y, -1, "Y floor should clamp eye height");
assertClose(floorFocus.y, 0, "Y floor should not slide focus without a radius clamp");

console.log("Camera boundary regression checks passed.");
