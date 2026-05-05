import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../3d/index.js", import.meta.url), "utf8");

const tapDotsOverlay = source.match(/function TapDotsOverlay\([\s\S]*?\n}\n\n\/\/ components\/sogs-migrated-viewer\/TapPickFeedback\.tsx/)?.[0] || "";
assert.ok(tapDotsOverlay, "TapDotsOverlay source block should exist");

assert.match(source, /var TAP_DOT_DEFAULT_MAX_VISIBLE_DISTANCE = 1\.35;/, "Tap dots should default to a close max visible distance so zoomed-out views stay uncluttered");
assert.match(source, /var TAP_DOT_OPACITY_ANIMATION_MS = 220;/, "Tap dots should use a fixed opacity animation duration");
assert.match(source, /function tapDotMaxVisibleDistance\(tapDot\)/, "Tap dots should resolve per-dot max visible distance");
assert.match(source, /function tapDotAnimatedOpacity\(current, target, deltaMs\)/, "Tap dots should smooth opacity changes with a fixed-rate helper");
assert.match(tapDotsOverlay, /const maxDistance = tapDotMaxVisibleDistance\(td\);/, "TapDotsOverlay should use the per-dot max visible distance resolver");
assert.match(tapDotsOverlay, /const animatedOpacity = tapDotAnimatedOpacity\(previousOpacity, targetOpacity, deltaMs\);/, "TapDotsOverlay should animate toward the distance target opacity");
assert.match(source, /caption: "Front Entry"[\s\S]*?maxVisibleDistance: 1\.2/, "Front Entry should have a shorter per-dot max visible distance");
assert.match(source, /caption: "Mountain Lawn"[\s\S]*?maxVisibleDistance: 1\.35/, "Mountain Lawn should have a shorter per-dot max visible distance");
assert.doesNotMatch(source, /caption: "Front Entry"[\s\S]*?maxDistance: 50/, "Bundled tap dots should not use the old zoomed-out 50-unit max distance");

const constants = source.match(/var TAP_DOT_DEFAULT_MIN_DISTANCE[\s\S]*?var TAP_DOT_OPACITY_ANIMATION_MS = [^;]+;/)?.[0] || "";
const maxVisibleFn = source.match(/function tapDotMaxVisibleDistance\(tapDot\) \{[\s\S]*?\n\}/)?.[0] || "";
const opacityFn = source.match(/function tapDotDistanceOpacity\(distance, minDistance, maxDistance, fadeDistance\) \{[\s\S]*?\n\}/)?.[0] || "";
const animatedOpacityFn = source.match(/function tapDotAnimatedOpacity\(current, target, deltaMs\) \{[\s\S]*?\n\}/)?.[0] || "";
assert.ok(constants && maxVisibleFn && opacityFn && animatedOpacityFn, "Tap dot distance helpers should be extractable");

const { tapDotMaxVisibleDistance, tapDotDistanceOpacity, tapDotAnimatedOpacity } = new Function(`${constants}\n${maxVisibleFn}\n${opacityFn}\n${animatedOpacityFn}\nreturn { tapDotMaxVisibleDistance, tapDotDistanceOpacity, tapDotAnimatedOpacity };`)();

assert.equal(tapDotMaxVisibleDistance({ maxVisibleDistance: 1.2 }), 1.2, "Explicit maxVisibleDistance should win");
assert.equal(tapDotMaxVisibleDistance({ maxDistance: 2.25 }), 2.25, "Legacy maxDistance should still work as a fallback");
assert.equal(tapDotMaxVisibleDistance({}), 1.35, "Missing max visible distance should use the uncluttered default");
assert.equal(tapDotDistanceOpacity(1.45, 0.06, 1.2, 0.16), 0, "Tap dot should be hidden after its max visible distance");
assert.ok(tapDotDistanceOpacity(0.8, 0.06, 1.2, 0.16) > 0.9, "Tap dot should be visible while within its distance window");
assert.equal(tapDotAnimatedOpacity(1, 0, 0), 1, "Zero elapsed time should not change opacity");
assert.equal(tapDotAnimatedOpacity(1, 0, 110), 0.5, "Fade-out should advance at the fixed animation rate");
assert.equal(tapDotAnimatedOpacity(1, 0, 1000), 0, "Long frames should clamp at the target opacity");
assert.equal(tapDotAnimatedOpacity(0, 1, 110), 0.5, "Fade-in should use the same fixed animation rate");

console.log("Tap dot distance regression checks passed.");
