'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_OUTPUT_PATH = path.join(__dirname, '..', 'src', 'renderer', 'sprite-manifest.json');
const STYLES = ['jacketed', 'no_jacket'];

const atlasRoot = process.argv[2] ? path.resolve(process.argv[2]) : '';
const outputPath = path.resolve(process.argv[3] || DEFAULT_OUTPUT_PATH);

if (!atlasRoot) {
  console.error('Usage: node scripts/generate-sprite-manifest.js <atlasRoot> [outputPath]');
  console.error('atlasRoot should contain jacketed/atlas and no_jacket/atlas JSON files.');
  process.exit(1);
}

const manifest = {};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function animationNameFor(style, name) {
  const prefix = `${style}/`;
  return name.startsWith(prefix) ? name.slice(prefix.length) : name;
}

for (const style of STYLES) {
  const atlasDirectory = path.join(atlasRoot, style, 'atlas');
  const atlasFiles = fs.readdirSync(atlasDirectory)
    .filter((fileName) => fileName.endsWith('.json'))
    .sort();

  assert(atlasFiles.length > 0, `No atlas JSON files found in ${atlasDirectory}`);

  for (const atlasFile of atlasFiles) {
    const atlasPath = path.join(atlasDirectory, atlasFile);
    const atlas = JSON.parse(fs.readFileSync(atlasPath, 'utf8'));
    const animationEntries = Object.entries(atlas.animations || {});

    assert(animationEntries.length > 0, `${atlasPath} has no animations`);
    assert(atlas.meta?.image, `${atlasPath} has no meta.image`);
    assert(
      atlas.meta?.frameSize?.w === atlas.meta?.frameSize?.h,
      `${atlasPath} does not have a square frameSize`,
    );

    const imageName = path.basename(atlas.meta.image);

    for (const [rawAnimationName, animation] of animationEntries) {
      const animationName = animationNameFor(style, rawAnimationName);
      assert(animationName, `${atlasPath} has an empty animation name`);
      assert(!manifest[animationName], `Duplicate animation name: ${animationName}`);
      assert(
        Array.isArray(animation.frames) && animation.frames.length > 0,
        `${atlasPath} animation ${rawAnimationName} has no frames`,
      );

      animation.frames.forEach((frameName, i) => {
        const gridFrame = atlas.frames?.[frameName];
        assert(gridFrame, `${atlasPath} is missing frame ${frameName}`);
        const { frame } = gridFrame;
        assert(frame, `${atlasPath} frame ${frameName} is missing its frame rect`);
        assert(
          frame.w === atlas.meta.frameSize.w && frame.h === atlas.meta.frameSize.h,
          `${atlasPath} frame ${frameName} is not ${atlas.meta.frameSize.w}×${atlas.meta.frameSize.h}`,
        );
        assert(
          frame.x === i * atlas.meta.frameSize.w && frame.y === 0,
          `${atlasPath} frame ${frameName} is not at its expected grid position`,
        );
      });

      manifest[animationName] = {
        style,
        sheet: `${style}/${imageName}`,
        frameSize: atlas.meta.frameSize.w,
        frameCount: animation.frames.length,
        fps: animation.fps,
        loop: animation.loop,
      };
    }
  }
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Generated ${Object.keys(manifest).length} animations at ${outputPath}`);
