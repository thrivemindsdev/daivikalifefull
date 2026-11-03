// Renders lucide-react icons exactly as React does and stores them in the Blade icon format:
// backend/resources/icons/<kebab-name>.svg = {"cls": "...", "inner": "..."}
// Usage: node make-icons.cjs <repo root> Truck Clock ShieldCheck ...
const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');

const root = process.argv[2];
const repoRequire = createRequire(path.join(root, 'package.json'));
const React = repoRequire('react');
const { renderToStaticMarkup } = repoRequire('react-dom/server');
const lucide = repoRequire('lucide-react');

for (const name of process.argv.slice(3)) {
  const Icon = lucide[name];
  if (!Icon) { console.error('unknown icon ' + name); process.exitCode = 1; continue; }
  const svg = renderToStaticMarkup(React.createElement(Icon));
  const cls = svg.match(/class="([^"]*)"/)[1];
  const inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  const file = name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([a-zA-Z])([0-9])/g, '$1-$2').toLowerCase();
  fs.writeFileSync(path.join(root, 'backend', 'resources', 'icons', file + '.svg'), JSON.stringify({ cls, inner }));
  console.log(file + '.svg  ' + cls);
}
