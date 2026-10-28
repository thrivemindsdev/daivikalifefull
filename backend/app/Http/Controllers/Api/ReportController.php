<?php

namespace App\Http\Controllers\Api;

use App\Services\AdminNotifier;
use App\Services\Reports;
use App\Services\VendorStore;
use App\Support\Json;
use App\Support\Text;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;

// Admin   GET /api/reports?from&to&groupBy&vendor=all|main|<vendorId>
//         GET /api/reports/compare?periods=<json>&vendor=...      periods: [{ from, to, label }]
//         GET /api/reports/submissions[?status=]   GET|PUT /api/reports/submissions/:id
// Vendor  GET /api/reports/me?from&to&groupBy
//         GET /api/reports/me/compare?periods=<json>
//         POST /api/reports/me/submit {from,to,groupBy,title,note} or {periods,title,note} for a comparison
//         GET /api/reports/me/submissions   GET /api/reports/me/submissions/:id
class ReportController extends ApiController
{
    protected function handle(string $method): Response
    {
        $user = $this->user();
        try {
            if ($method === 'GET') {
                if (! $user) {
                    return $this->error('Not authorized', 401);
                }
                return $this->get($user->role);
            }
            if ($method === 'POST') {
                if (! $user || $user->role !== 'vendor') {
                    return $this->error('Not authorized', 401);
                }
                return $this->submit();
            }
            if ($method === 'PUT') {
                if (! $user || $user->role !== 'admin') {
                    return $this->notAdmin();
                }
                return $this->review();
            }
            return $this->notFound();
        } catch (\Throwable $e) {
            if (! $e instanceof RuntimeException) {
                report($e);
            }
            return $this->error($e->getMessage(), 400);
        }
    }

    private static function range(array $params): array
    {
        $from = Reports::toMs($params['from'] ?? null);
        $to = Reports::toMs($params['to'] ?? null);
        if ($from === null || $to === null) {
            throw new RuntimeException('Valid from and to dates are required');
        }
        $groupBy = in_array($params['groupBy'] ?? null, Reports::GROUPS, true) ? $params['groupBy'] : 'auto';
        return [$from, $to, $groupBy];
    }

    // A JSON string or an array of { from, to, label } (dates as ISO strings or ms)
    private static function periods(mixed $raw): array
    {
        $list = $raw;
        if (is_string($raw)) {
            $list = Json::decode($raw);
            if ($list === null) {
                throw new RuntimeException('Invalid periods');
            }
        }
        if (! is_array($list) || ! array_is_list($list)) {
            throw new RuntimeException('Choose the periods to compare');
        }
        return array_map(function ($p) {
            $p = Json::arr($p);
            return [
                'from' => Reports::toMs($p['from'] ?? null) ?? NAN,
                'to' => Reports::toMs($p['to'] ?? null) ?? NAN,
                'label' => mb_substr(Text::s($p['label'] ?? ''), 0, 40),
            ];
        }, $list);
    }

    private function vendorProfile(): ?array
    {
        return VendorStore::getVendorByUserId($this->user()->id);
    }

    private function get(string $role): Response
    {
        $query = $this->request->query();

        if ($this->seg(0) === 'me') {
            if ($role !== 'vendor') {
                return $this->error('Not a vendor account', 403);
            }
            $vendor = $this->vendorProfile();
            if (! $vendor) {
                return $this->error('Vendor profile not found', 404);
            }
            $scope = $vendor['businessName'] ?: $vendor['name'];
            if ($this->seg(1) === 'submissions') {
                if (! $this->seg(2)) {
                    return $this->ok(VendorStore::listReports($vendor['id']));
                }
                $report = VendorStore::getReport($this->seg(2));
                if (! $report || $report['vendorId'] !== $vendor['id']) {
                    return $this->error('Report not found', 404);
                }
                return $this->ok($report);
            }
            if ($this->seg(1) === 'compare') {
                return $this->ok(Reports::compare(self::periods($query['periods'] ?? null), $vendor['id'], true, $scope));
            }
            [$from, $to, $groupBy] = self::range($query);
            return $this->ok(Reports::build($from, $to, $groupBy, $vendor['id'], true, $scope));
        }

        if ($role !== 'admin') {
            return $this->notAdmin();
        }

        if ($this->seg(0) === 'submissions') {
            if (! $this->seg(1)) {
                return $this->ok(VendorStore::listReports(null, ($query['status'] ?? '') ?: null));
            }
            $report = VendorStore::getReport($this->seg(1));
            return $report ? $this->ok($report) : $this->error('Report not found', 404);
        }

        $vendorParam = ! empty($query['vendor']) && $query['vendor'] !== 'all' ? (string) $query['vendor'] : null;
        if ($vendorParam && $vendorParam !== 'main' && ! VendorStore::getVendor($vendorParam)) {
            return $this->error('Vendor not found', 404);
        }
        if ($this->seg(0) === 'compare') {
            return $this->ok(Reports::compare(self::periods($query['periods'] ?? null), $vendorParam));
        }
        [$from, $to, $groupBy] = self::range($query);
        return $this->ok(Reports::build($from, $to, $groupBy, $vendorParam));
    }

    private function submit(): Response
    {
        if ($this->seg(0) !== 'me' || $this->seg(1) !== 'submit') {
            return $this->notFound();
        }
        $vendor = $this->vendorProfile();
        if (! $vendor) {
            return $this->error('Vendor profile not found', 404);
        }
        $body = $this->body();
        $vendorName = $vendor['businessName'] ?: $vendor['name'];
        $isComparison = isset($body['periods']) && is_array($body['periods']) && array_is_list($body['periods']);

        // Figures are always rebuilt here from the vendor's own orders, never taken from the request
        $summary = null;
        if ($isComparison) {
            $data = Reports::compare(self::periods($body['periods']), $vendor['id'], true, $vendorName);
            $from = $data['meta']['from'];
            $to = $data['meta']['to'];
            $groupBy = 'compare';
            $summary = $data['periods'][count($data['periods']) - 1]['summary'];
        } else {
            [$from, $to, $gb] = self::range($body);
            $data = Reports::build($from, $to, $gb, $vendor['id'], true, $vendorName);
            $groupBy = $data['meta']['groupBy'];
        }

        $title = mb_substr(trim(Text::s($body['title'] ?? '')), 0, 120) ?: $vendorName.($isComparison ? ' comparison' : ' report');
        $saved = VendorStore::createReport([
            'vendorId' => $vendor['id'],
            'vendorName' => $vendorName,
            'title' => $title,
            'from' => $from,
            'to' => $to,
            'groupBy' => $groupBy,
            'note' => mb_substr(trim(Text::s($body['note'] ?? '')), 0, 2000),
            'data' => $data,
            'summary' => $summary,
        ]);
        AdminNotifier::notify(
            $isComparison ? 'Vendor comparison submitted 📊' : 'Vendor report submitted 📊',
            $isComparison
                ? "$vendorName submitted \"{$saved['title']}\" comparing ".implode(' vs ', array_column($data['periods'], 'label')).'.'
                : "$vendorName submitted \"{$saved['title']}\" ({$data['meta']['fromLabel']} – {$data['meta']['toLabel']}).",
            'system',
            '/admin/dashboard?tab=reports'
        );
        return $this->ok($saved, 201);
    }

    private function review(): Response
    {
        if ($this->seg(0) !== 'submissions' || ! $this->seg(1)) {
            return $this->notFound();
        }
        $body = $this->body();
        $status = isset($body['status']) && $body['status'] !== '' ? Text::s($body['status']) : null;
        if ($status && ! in_array($status, ['submitted', 'reviewed'], true)) {
            return $this->error('Invalid status', 400);
        }
        $adminNote = array_key_exists('adminNote', $body) && $body['adminNote'] !== null ? mb_substr(Text::s($body['adminNote']), 0, 2000) : null;
        return $this->ok(VendorStore::updateReport($this->seg(1), $status, $adminNote));
    }
}
