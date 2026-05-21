import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../3d/index.js", import.meta.url), "utf8");

assert.match(source, /maxDistance: 1,/, "HMC orbit max distance should be one unit.");
assert.match(source, /maxRadiusFromOrigin: 50/, "HMC world-origin safety radius should stay separate from the one-unit orbit max distance.");
assert.doesNotMatch(source, /maxRadiusFromOrigin: 1\b/, "The one-unit zoom limit should not be implemented as a world-origin radius clamp.");
assert.match(source, /type: "sogs:orbitLimits"/, "Parent viewer should send orbit zoom limits into the SOGS iframe.");
assert.match(source, /minDistance: roundSplatThousandths\(activeHoleView\.minDistance\)/, "Orbit limits should preserve the configured minimum distance.");
assert.match(source, /maxDistance: maxR/, "Orbit limits should use the editable max distance value.");

const splatPanel = source.match(/id: "splatAlignPanel"[\s\S]*?children: "Reset defaults"/)?.[0] || "";
assert.ok(splatPanel, "Splat align panel should be extractable.");
const copyButtonIndex = source.indexOf('children: "Copy splat align JSON"');
assert.notEqual(copyButtonIndex, -1, "Splat align copy button should exist.");
const copyButtonBlock = source.slice(Math.max(0, copyButtonIndex - 2400), copyButtonIndex + 80);
assert.match(copyButtonBlock, /onClick: async \(\) => \{/, "Splat align copy action should support async clipboard fallbacks.");
assert.match(copyButtonBlock, /await copyTextToClipboard\(text\);/, "Splat align copy should use the shared clipboard helper.");
assert.match(copyButtonBlock, /orbitLimits: \{[\s\S]*?maxDistance: roundSplatThousandths\(cameraMaxRadius\)/, "Splat align copy should include orbit max distance separately from camera bounds.");
assert.doesNotMatch(copyButtonBlock, /maxRadiusFromOrigin: roundSplatThousandths\(cameraMaxRadius\)/, "Splat align copy should not serialize max distance as world-origin radius.");
assert.doesNotMatch(splatPanel, /navigator\.clipboard\.writeText\(text\)/, "Splat align copy should not bypass the local dev clipboard bridge.");
assert.match(copyButtonBlock, /console\.error\("Splat align JSON copy failed", error2\);/, "Splat align copy failures should log a specific error.");

console.log("Splat align regression checks passed.");
