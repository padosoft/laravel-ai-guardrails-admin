import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const publicRoot = join(root, 'public');
const assetPath = 'vendor/ai-guardrails-admin';
const manifestPath = join(publicRoot, assetPath, '.vite', 'manifest.json');
const mountPrefix = 'admin/ai-guardrails';
const port = Number(process.env.PORT || 4173);

const types = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
]);

function html() {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const entry = manifest['resources/js/main.tsx'];
  const css = Array.isArray(entry.css) ? entry.css : [];
  const config = {
    api_base: '/ai-guardrails/api',
    mount_prefix: mountPrefix,
    theme_default: 'dark',
    asset_path: assetPath,
  };

  return `<!doctype html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="csrf-token" content="test-csrf-token">
  <title>AI Guardrails Admin E2E</title>
  <script>window.__AI_GUARDRAILS_ADMIN__ = ${JSON.stringify(config)};</script>
  ${css.map((file) => `<link rel="stylesheet" href="/${assetPath}/${file}">`).join('\n  ')}
</head>
<body>
  <div id="agr-root"></div>
  <script type="module" src="/${assetPath}/${entry.file}"></script>
</body>
</html>`;
}

function sendStatic(requestUrl, response) {
  const relative = requestUrl.replace(/^\/+/, '');
  const file = normalize(join(publicRoot, relative));

  if (!file.startsWith(publicRoot) || !existsSync(file)) {
    return false;
  }

  response.writeHead(200, { 'content-type': types.get(extname(file)) ?? 'application/octet-stream' });
  createReadStream(file).pipe(response);

  return true;
}

createServer((request, response) => {
  const url = request.url ?? '/';

  if (url.startsWith(`/${assetPath}/`) && sendStatic(url, response)) {
    return;
  }

  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end(html());
}).listen(port, '127.0.0.1', () => {
  console.log(`E2E server on http://127.0.0.1:${port}/${mountPrefix}`);
});
