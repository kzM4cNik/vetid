import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const libs = [
  'node_modules/@tensorflow/tfjs/dist/tf.min.js',
  'node_modules/@tensorflow-models/coco-ssd/dist/coco-ssd.min.js',
  'node_modules/@tensorflow-models/mobilenet/dist/mobilenet.min.js',
  'ml/breeds.js',
  'ml/engine.web.js',
];

const script = libs.map(read).join('\n;\n').replace(/<\/script/gi, '<\\/script');

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="background:transparent"><script>${script}</script></body></html>`;

mkdirSync(join(root, 'src/ml'), { recursive: true });
writeFileSync(
  join(root, 'src/ml/engineHtml.generated.ts'),
  `export const ENGINE_HTML: string = ${JSON.stringify(html)};\n`
);

const testHarness = read('ml/test-harness.html');
writeFileSync(join(root, 'ml/test.html'), html.replace('</body>', `${testHarness}</body>`));

console.log(`engine: ${(html.length / 1024 / 1024).toFixed(2)} MB`);
