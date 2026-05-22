import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../3d/index.js", import.meta.url), "utf8");

const panelBlock = source.match(/function AnimationPathPanel\([\s\S]*?\n}\n\n\/\/ components\/sogs-migrated-viewer\/SogsMigratedViewer\.tsx/)?.[0] || "";
assert.ok(panelBlock, "Animation path panel should be extractable.");
assert.match(panelBlock, /const exportJson = .*?useCallback\)\(async \(\) => \{/, "Animation path copy action should be async.");
assert.match(panelBlock, /await copyTextToClipboard\(json\);/, "Animation path copy should use the shared clipboard helper.");
assert.doesNotMatch(panelBlock, /navigator\.clipboard\.writeText\(json\)/, "Animation path copy should not bypass local dev and legacy clipboard fallbacks.");
assert.match(panelBlock, /console\.error\("Path JSON copy failed", error2\);/, "Animation path copy failures should log a specific error.");
assert.match(panelBlock, /setCopyFeedback\("Copied"\)/, "Animation path copy should show success feedback.");
assert.match(panelBlock, /setCopyFeedback\("Copy failed"\)/, "Animation path copy should show failure feedback.");

console.log("Path copy regression checks passed.");
