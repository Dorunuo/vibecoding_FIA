// Run from any cwd: node 任务C/一键检验.mjs. No HTTP server required.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url));
function run(args){console.log('\n> node '+args.join(' '));execFileSync(process.execPath,args,{cwd:root,stdio:'inherit'});}
for(const file of readdirSync(new URL('../src/',import.meta.url)).filter(f=>f.endsWith('.js')))run(['--check','src/'+file]);
for(const test of ['穿模扫描与验证.mjs','demo-controller-test.mjs','main-integration-test.mjs','gameplay-regression.mjs','audio-ui-test.mjs','第2批自动测试.mjs','主游戏输入自动测试.mjs','demo-integration.mjs'])run(['任务C/'+test]);
run(['--import','./任务C/node-assets.mjs','test-asset-integration.mjs']);
const html=readFileSync(new URL('../遗迹回声_新素材整合版.html',import.meta.url),'utf8');
assert.equal(html,readFileSync(new URL('../遗迹回声_B验证版.html',import.meta.url),'utf8'));
assert(html.includes('C 完整功能版 C2'));
for(const [,script] of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(script);
assert(!html.includes('Demo 尚未实现')); console.log('\nPASS exports: identical C2 bundles and inline script syntax.');
console.log('ALL AUTOMATED CHECKS PASSED. Real browser visual/audio and human acceptance remain separate.');
