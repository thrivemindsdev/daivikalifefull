export const dynamic = 'force-dynamic';

import { initAPI, getAuthenticatedUser, errorResponse, jsonResponse } from '@/lib/api-middleware';
import { buildReport, buildComparison } from '@/lib/reports';
import {
  getVendorByUserId, getVendor, createVendorReport, listVendorReports, getVendorReport, updateVendorReport,
} from '@/lib/vendor-store';
import { notifyAdmins } from '@/lib/admin-notifier';

// Routes:
//  Admin   GET /api/reports?from&to&groupBy&vendor=all|main|<vendorId>
//          GET /api/reports/compare?periods=<json>&vendor=...      periods: [{ from, to, label }]
//          GET /api/reports/submissions[?status=]   GET|PUT /api/reports/submissions/:id
//  Vendor  GET /api/reports/me?from&to&groupBy
//          GET /api/reports/me/compare?periods=<json>
//          POST /api/reports/me/submit {from,to,groupBy,title,note} or {periods,title,note} for a comparison
//          GET /api/reports/me/submissions   GET /api/reports/me/submissions/:id

const GROUPS = ['auto', 'hour', 'day', 'week', 'month', 'year'];

function rangeFrom(params) {
  const from = new Date(params.from).getTime();
  const to = new Date(params.to).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to)) throw new Error('Valid from and to dates are required');
  const groupBy = GROUPS.includes(params.groupBy) ? params.groupBy : 'auto';
  return { from, to, groupBy };
}

// Accepts a JSON string or an array of { from, to, label } (dates as ISO strings or ms)
function periodsFrom(raw) {
  let list = raw;
  if (typeof raw === 'string') {
    try { list = JSON.parse(raw); } catch { throw new Error('Invalid periods'); }
  }
  if (!Array.isArray(list)) throw new Error('Choose the periods to compare');
  return list.map(p => ({
    from: new Date(p.from).getTime(),
    to: new Date(p.to).getTime(),
    label: String(p.label || '').slice(0, 40),
  }));
}

const idOf = (doc) => (doc?._id || doc?.id || '').toString();

export async function GET(req, { params }) {
  await initAPI();
  const path = (await params).path || [];
  const user = await getAuthenticatedUser(req);
  if (!user) return errorResponse('Not authorized', 401);
  const query = Object.fromEntries(new URL(req.url).searchParams);

  try {
    if (path[0] === 'me') {
      if (user.role !== 'vendor') return errorResponse('Not a vendor account', 403);
      const vendor = await getVendorByUserId(idOf(user));
      if (!vendor) return errorResponse('Vendor profile not found', 404);
      const scopeLabel = vendor.businessName || vendor.name;

      if (path[1] === 'submissions') {
        if (!path[2]) return jsonResponse(await listVendorReports({ vendorId: vendor.id }));
        const report = await getVendorReport(path[2]);
        if (!report || report.vendorId !== vendor.id) return errorResponse('Report not found', 404);
        return jsonResponse(report);
      }
      if (path[1] === 'compare') {
        return jsonResponse(await buildComparison({ periods: periodsFrom(query.periods), vendorId: vendor.id, forVendor: true, scopeLabel }));
      }
      return jsonResponse(await buildReport({ ...rangeFrom(query), vendorId: vendor.id, forVendor: true, scopeLabel }));
    }

    if (user.role !== 'admin') return errorResponse('Not authorized as an admin', 401);

    if (path[0] === 'submissions') {
      if (!path[1]) return jsonResponse(await listVendorReports({ status: query.status || undefined }));
      const report = await getVendorReport(path[1]);
      return report ? jsonResponse(report) : errorResponse('Report not found', 404);
    }

    const vendorParam = query.vendor && query.vendor !== 'all' ? query.vendor : undefined;
    if (vendorParam && vendorParam !== 'main' && !(await getVendor(vendorParam))) return errorResponse('Vendor not found', 404);
    if (path[0] === 'compare') {
      return jsonResponse(await buildComparison({ periods: periodsFrom(query.periods), vendorId: vendorParam }));
    }
    return jsonResponse(await buildReport({ ...rangeFrom(query), vendorId: vendorParam }));
  } catch (err) {
    return errorResponse(err.message, 400);
  }
}

export async function POST(req, { params }) {
  await initAPI();
  const path = (await params).path || [];
  const user = await getAuthenticatedUser(req);
  if (!user || user.role !== 'vendor') return errorResponse('Not authorized', 401);
  if (path[0] !== 'me' || path[1] !== 'submit') return errorResponse('API endpoint not found', 404);

  try {
    const vendor = await getVendorByUserId(idOf(user));
    if (!vendor) return errorResponse('Vendor profile not found', 404);
    const body = await req.json();
    const vendorName = vendor.businessName || vendor.name;
    const isComparison = Array.isArray(body.periods);

    // Figures are always rebuilt here from the vendor's own orders, never taken from the request
    let data, from, to, groupBy, summary;
    if (isComparison) {
      data = await buildComparison({ periods: periodsFrom(body.periods), vendorId: vendor.id, forVendor: true, scopeLabel: vendorName });
      ({ from, to } = data.meta);
      groupBy = 'compare';
      summary = data.periods[data.periods.length - 1].summary;
    } else {
      const range = rangeFrom(body);
      data = await buildReport({ ...range, vendorId: vendor.id, forVendor: true, scopeLabel: vendorName });
      ({ from, to } = range);
      groupBy = data.meta.groupBy;
    }

    const saved = await createVendorReport({
      vendorId: vendor.id,
      vendorName,
      title: String(body.title || '').trim().slice(0, 120) || `${vendorName} ${isComparison ? 'comparison' : 'report'}`,
      from,
      to,
      groupBy,
      note: String(body.note || '').trim().slice(0, 2000),
      data,
      summary,
    });
    notifyAdmins({
      title: isComparison ? 'Vendor comparison submitted 📊' : 'Vendor report submitted 📊',
      message: isComparison
        ? `${vendorName} submitted "${saved.title}" comparing ${data.periods.map(p => p.label).join(' vs ')}.`
        : `${vendorName} submitted "${saved.title}" (${data.meta.fromLabel} – ${data.meta.toLabel}).`,
      type: 'system',
      link: '/admin/dashboard?tab=reports',
    }).catch(() => {});
    return jsonResponse(saved, 201);
  } catch (err) {
    return errorResponse(err.message, 400);
  }
}

export async function PUT(req, { params }) {
  await initAPI();
  const path = (await params).path || [];
  const user = await getAuthenticatedUser(req);
  if (!user || user.role !== 'admin') return errorResponse('Not authorized as an admin', 401);
  if (path[0] !== 'submissions' || !path[1]) return errorResponse('API endpoint not found', 404);
  try {
    const { status, adminNote } = await req.json();
    if (status && !['submitted', 'reviewed'].includes(status)) return errorResponse('Invalid status', 400);
    return jsonResponse(await updateVendorReport(path[1], { status, adminNote: adminNote === undefined ? undefined : String(adminNote).slice(0, 2000) }));
  } catch (err) {
    return errorResponse(err.message, 400);
  }
}
