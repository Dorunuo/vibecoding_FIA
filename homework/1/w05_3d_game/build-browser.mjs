// Produce a self-contained file:// preview without changing the shared entry.
// Run: node build-browser.mjs (uses installed local Three.js; no download needed).
// This small packer supports the project's current static named/namespace imports.
import { readFile, writeFile } from 'node:fs/promises';
import { posix } from 'node:path';
const root = new URL('./', import.meta.url);
const modules = new Map();
const embedded = {};
for (const path of ['assets/explorer.glb', 'assets/ruins-environment.glb', 'assets/ruins-treasure-colliders.glb']) {
  embedded[path] = 'data:model/gltf-binary;base64,' + (await readFile(new URL(path, root))).toString('base64');
}
async function pack(name) {
  if (modules.has(name)) return;
  modules.set(name, '');
  const path = name === 'three' ? 'node_modules/three/build/three.module.js'
    : name.startsWith('three/addons/') ? 'node_modules/three/examples/jsm/' + name.slice(13) : 'src/' + name;
  let source = await readFile(new URL(path, root), 'utf8');
  if (name === 'model-assets.js') source = source.replace('export const EMBEDDED_MODELS = {};', 'export const EMBEDDED_MODELS = ' + JSON.stringify(embedded) + ';');
  if (name === 'asset-level.js') source = source.replace(/export const EMBEDDED_LEVEL_MANIFEST\s*=\s*null;/, 'export const EMBEDDED_LEVEL_MANIFEST = ' + await readFile(new URL('assets/level-manifest.json', root), 'utf8') + ';');
  const imports = [...source.matchAll(/^import\s+(\{[^}]+\}|\*\s+as\s+\w+)\s+from\s+['"](.+?)['"];?\s*$/gm)];
  for (const match of imports) {
    const dependency = match[2].startsWith('.') ? posix.normalize(posix.join(posix.dirname(name), match[2])) : match[2];
    await pack(dependency);
    const binding = match[1].startsWith('* as ')
      ? match[1].slice(5) : match[1].replace(/\bas\b/g, ':');
    source = source.replace(match[0], `const ${binding} = load(${JSON.stringify(dependency)});`);
  }
  const names = [...source.matchAll(/^export\s+(?:const|let|var|(?:async\s+)?function|class)\s+(\w+)/gm)].map(match => match[1]);
  source = source.replace(/^export\s+(?=(?:const|let|var|(?:async\s+)?function|class)\s)/gm, '');
  source = source.replace(/export\s*\{([^}]+)\};?/g, (_, list) => {
    const entries = list.split(',').map(item => {
      const [local, publicName] = item.trim().split(/\s+as\s+/);
      return `${JSON.stringify(publicName || local)}: ${local}`;
    });
    return `Object.assign(exports, {${entries.join(',')}});`;
  });
  modules.set(name, `function(exports, load) {\n${source}\nObject.assign(exports, {${names.join(',')}});\n}`);
}
await pack('main.js');
const bundle = `(function(){'use strict';const factories={${[...modules].map(([name, source]) => JSON.stringify(name) + ':' + source).join(',')}};const cache={};function load(name){if(cache[name])return cache[name];const exports=cache[name]={};factories[name](exports,load);return exports;}load('main.js');})();`;
const [html, css] = await Promise.all([
  readFile(new URL('index.html', root), 'utf8'),
  readFile(new URL('style.css', root), 'utf8'),
]);
const instructions = '<p class="hint" style="max-width:640px;text-align:center;padding:0 16px">新素材整合版：WASD 移动 · 按住鼠标左/右键拖动镜头 · Shift 跑步 · Space 跳跃 · E 挖掘/开盒 · Esc 暂停。沿楼梯探索三层，避开洞口地刺；可一键观看真实流程 Demo，右下角调音量或静音。</p>';
const errorHandler = `window.addEventListener('error', function(event) {
  var el = document.getElementById('browser-error');
  el.hidden = false;
  el.textContent = '启动失败：' + event.message + '。请使用新版 Chrome / Edge，启用硬件加速，并将错误截图反馈。';
});`;
const output = html
  .replace('<link rel="stylesheet" href="./style.css" />', `<style>${css}</style>`)
  .replace(/<script type="importmap">[\s\S]*?<\/script>/, '')
  .replace('<p class="subtitle">Echoes of the Buried Relic</p>', '<p class="subtitle">Echoes of the Buried Relic · 三层遗迹 · R2 + C 完整功能版 C2</p>' + instructions)
  .replace('<script type="module" src="./src/main.js"></script>', () =>
    '<pre id="browser-error" hidden style="position:fixed;bottom:0;left:0;right:0;z-index:99;background:#481c1c;color:white;padding:16px;white-space:pre-wrap"></pre>' +
    '<script>' + errorHandler + '</script><script>\n' + bundle.replace(/<\/script/gi, '<\\/script') + '\n</script>');
await writeFile(new URL('遗迹回声_B验证版.html', root), output);
await writeFile(new URL('遗迹回声_新素材整合版.html', root), output);
console.log('Created standalone integrated HTML (' + Buffer.byteLength(output) + ' bytes each)');
