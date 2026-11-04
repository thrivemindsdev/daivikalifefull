// Builds the admin and vendor dashboards from the Next.js source (app/(admin), app/(vendor), components, ...)
// into backend/public/dashboard, so Laravel can serve them without a Next.js server.
// Usage (from this folder): npm install && npm run build
import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const out = path.join(repo, 'backend/public/dashboard');
const exts = ['', '.jsx', '.js', '.tsx', '.ts', '/index.jsx', '/index.js'];

// "@/..." imports point at the repo root (jsconfig paths); next/* points at the small shims here
const resolver = {
  name: 'daivika-paths',
  setup(build) {
    const shim = (file) => ({ path: path.join(here, 'shims', file) });
    build.onResolve({ filter: /^next\/link$/ }, () => shim('next-link.jsx'));
    build.onResolve({ filter: /^next\/navigation$/ }, () => shim('next-navigation.js'));
    build.onResolve({ filter: /^next\/script$/ }, () => shim('next-script.jsx'));
    build.onResolve({ filter: /^@\// }, (args) => {
      const base = path.join(repo, args.path.slice(2));
      for (const e of exts) if (fs.existsSync(base + e) && fs.statSync(base + e).isFile()) return { path: base + e };
      return { errors: [{ text: `Cannot resolve ${args.path}` }] };
    });
  },
};

fs.rmSync(out, { recursive: true, force: true });
await esbuild.build({
  entryPoints: { admin: path.join(here, 'admin.jsx'), vendor: path.join(here, 'vendor.jsx') },
  outdir: out,
  bundle: true,
  splitting: true,
  format: 'esm',
  minify: true,
  sourcemap: false,
  target: ['es2020'],
  jsx: 'automatic',
  loader: { '.js': 'jsx', '.png': 'file', '.jpg': 'file', '.svg': 'file', '.woff2': 'file' },
  nodePaths: [path.join(repo, 'node_modules')],
  entryNames: '[name]',
  chunkNames: 'chunks/[name]-[hash]',
  assetNames: 'assets/[name]-[hash]',
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY': 'window.__DAIVIKA_VAPID__',
    'process.env.NEXT_PUBLIC_API_BASE_URL': 'undefined',
  },
  plugins: [resolver],
  logLevel: 'info',
});
console.log('Dashboards built into', path.relative(repo, out));
