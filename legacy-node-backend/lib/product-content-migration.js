// One-time split of old product descriptions into the separate content fields.
// Older products have every section typed into `description` under headings, e.g.
//   "Short descriptionA traditional mala…Detailed DescriptionThe White…Benefits & Key Features\n…How to Wear\n…"
// The split runs on startup and only touches products whose new fields are all still empty,
// so products that were already split or edited in admin are never changed again.

const SECTIONS = [
  { key: 'shortDescription', pattern: 'short\\s*description' },
  { key: 'description', pattern: 'detailed\\s*description' },
  { key: 'benefits', pattern: 'benefits\\s*(?:&|and)\\s*key\\s*features' },
  { key: 'astrologySignificance', pattern: 'astrology\\s*(?:&|and)\\s*spiritual\\s*significance' },
  { key: 'howToWear', pattern: 'how\\s*to\\s*wear' },
];
const DETAIL_KEYS = ['shortDescription', 'benefits', 'astrologySignificance', 'howToWear'];

// A heading starts the text, a line, or follows the end of a sentence (". Detailed Description" or ".Detailed Description"),
// so a phrase like "learn how to wear it" inside a sentence is not mistaken for a heading.
const headingRegex = (pattern) => new RegExp(`(^|[.!?:)\\n]\\s*)(${pattern})\\s*:?[ \\t]*\\n?`, 'i');

const clean = (text) => text
  .replace(/\r\n/g, '\n')
  .split('\n').map(l => l.trim()).join('\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

// Returns { description, shortDescription, benefits, astrologySignificance, howToWear } or null when the
// text doesn't use the section headings.
export function splitLegacyDescription(raw) {
  const text = String(raw || '').replace(/\r\n/g, '\n');
  const found = [];
  for (const s of SECTIONS) {
    const m = headingRegex(s.pattern).exec(text);
    if (!m) continue;
    const headingStart = m.index + m[1].length;
    found.push({ key: s.key, headingStart, contentStart: m.index + m[0].length });
  }
  // Needs the detailed-description heading plus at least one other section to be sure this is the old format
  if (!found.some(f => f.key === 'description') || found.length < 2) return null;

  found.sort((a, b) => a.headingStart - b.headingStart);
  const out = { description: '', shortDescription: '', benefits: '', astrologySignificance: '', howToWear: '' };
  const before = clean(text.slice(0, found[0].headingStart));
  found.forEach((f, i) => {
    const end = i + 1 < found.length ? found[i + 1].headingStart : text.length;
    out[f.key] = clean(text.slice(f.contentStart, end));
  });
  // Any text before the first heading belongs to the detailed description
  if (before) out.description = out.description ? `${before}\n\n${out.description}` : before;
  if (!out.description) return null;
  return out;
}

export async function migrateLegacyDescriptions(prisma) {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, description: true, shortDescription: true, benefits: true, astrologySignificance: true, howToWear: true },
  });
  let updated = 0;
  for (const p of products) {
    if (DETAIL_KEYS.some(k => String(p[k] || '').trim())) continue;
    const split = splitLegacyDescription(p.description);
    if (!split) continue;
    await prisma.product.update({ where: { id: p.id }, data: split });
    updated++;
    console.log(`[content-migration] Split description into sections for "${p.name}" (${p.id})`);
  }
  if (updated) console.log(`[content-migration] ${updated} product description(s) split into separate fields.`);
  return updated;
}
