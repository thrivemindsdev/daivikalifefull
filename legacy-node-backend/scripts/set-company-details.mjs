// Writes the company's legal name, address and contact details into the "invoice_settings" setting.
// These are shown on the Contact and FAQ pages and printed on invoices (Admin → Invoice Control edits the same record).
// Other invoice settings (logo, invoice prefix, next invoice number, page texts) are kept as they are.
//
//   node scripts/set-company-details.mjs            uses DATABASE_URL, or data/custom_settings.json when no database is set
import fs from 'fs';
import path from 'path';

const DETAILS = {
  companyName: 'Daivika',
  companyStreet: 'Thriveminds Technologies Pvt Ltd, Suite No-13, 1st Floor, Carnival Infopark Phase 1, Infopark Road, Infopark Campus, Kakkanad',
  companyCity: 'Kochi',
  companyState: 'Keralam',
  companyPin: '682030',
  companyPhone: '+91 81297 89123',
  companyEmail: 'support@zodimithra.com',
};

async function main() {
  if (process.env.DATABASE_URL) {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    try {
      const row = await prisma.setting.findUnique({ where: { key: 'invoice_settings' } });
      const value = { ...(row?.value || {}), ...DETAILS };
      await prisma.setting.upsert({ where: { key: 'invoice_settings' }, update: { value }, create: { key: 'invoice_settings', value } });
      console.log('Updated invoice_settings in the database.');
    } finally {
      await prisma.$disconnect();
    }
    return;
  }

  const file = path.join(process.cwd(), 'data', 'custom_settings.json');
  const settings = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
  const row = settings.find(s => s.key === 'invoice_settings');
  if (row) row.value = { ...(row.value || {}), ...DETAILS };
  else settings.push({ key: 'invoice_settings', value: DETAILS });
  fs.writeFileSync(file, JSON.stringify(settings, null, 2));
  console.log('No DATABASE_URL: updated data/custom_settings.json (offline mode).');
}

main().catch(err => { console.error('Could not update company details:', err.message); process.exit(1); });
