// Local asset adapter for Node geometry tests; NOT a renderer/audio substitute.
import { readFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const nativeFetch = globalThis.fetch;
const NativeRequest = globalThis.Request;
globalThis.self = globalThis;
globalThis.ProgressEvent = class { constructor(type, fields) { this.type = type; Object.assign(this, fields); } };
globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close() {} });
globalThis.Request = class extends NativeRequest {
  constructor(url, options) { super(typeof url === 'string' || url instanceof URL ? new URL(url, 'http://127.0.0.1:5173/') : url, options); }
};
globalThis.fetch = async (request, options) => {
  const url = new URL(typeof request === 'string' ? request : request.url ?? request.href, 'http://127.0.0.1:5173/');
  if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return nativeFetch(request, options);
  const data = await readFile(new URL('.' + decodeURIComponent(url.pathname), root));
  return new Response(data, { headers: { 'Content-Length': String(data.length), 'Content-Type': url.pathname.endsWith('.json') ? 'application/json' : 'model/gltf-binary' } });
};
