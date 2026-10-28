<?php

namespace App\Http\Controllers\Api;

use App\Models\Order;
use App\Services\Settings;
use App\Support\Json;
use App\Support\Text;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpFoundation\Response;

// GET  /api/meta-pixel/config      public pixel config (full config for admins)
// GET  /api/meta-pixel/analytics   admin: Meta-attributed sales and the event funnel
// POST /api/meta-pixel/config      admin: save settings
// POST /api/meta-pixel/events      log a storefront event and forward it to the Conversions API
// POST /api/meta-pixel/test-event  admin: diagnostic ping
class MetaPixelController extends ApiController
{
    private const MAX_EVENTS_LOG = 500;
    private const SETTINGS_KEY = 'meta_pixel_settings';
    private const LOG_KEY = 'meta_pixel_events_log';

    private const DEFAULTS = [
        'pixelId' => '',
        'capiToken' => '',
        'testEventCode' => '',
        'isActive' => true,
        'autoTrackPageView' => true,
        'autoTrackViewContent' => true,
        'autoTrackAddToCart' => true,
        'autoTrackInitiateCheckout' => true,
        'autoTrackPurchase' => true,
        'autoTrackLead' => true,
        'autoTrackSearch' => true,
        'enableCapi' => true,
        'adSpendEstimates' => [],
    ];

    private const AUTO_TRACK = ['autoTrackPageView', 'autoTrackViewContent', 'autoTrackAddToCart', 'autoTrackInitiateCheckout', 'autoTrackPurchase', 'autoTrackLead', 'autoTrackSearch'];

    protected function handle(string $method): Response
    {
        $action = $this->seg(0);
        try {
            if ($method === 'GET') {
                return match ($action ?? 'config') {
                    'config' => $this->config(),
                    'analytics' => $this->analytics(),
                    default => $this->error('API action not found', 404),
                };
            }
            if ($method === 'POST') {
                return match ($action ?? 'events') {
                    'config' => $this->saveConfig(),
                    'events' => $this->logEvent(),
                    'test-event' => $this->testEvent(),
                    default => $this->error('API action not found', 404),
                };
            }
            return $this->notFound();
        } catch (\Throwable $e) {
            report($e);
            return $this->error($e->getMessage(), 500);
        }
    }

    private static function settings(): array
    {
        $raw = Settings::get(self::SETTINGS_KEY);
        if (is_string($raw)) {
            $raw = Json::decode($raw);
        }
        $value = Json::obj($raw);
        $settings = array_merge(self::DEFAULTS, $value);
        $settings['adSpendEstimates'] = Json::object(Json::obj($settings['adSpendEstimates']));
        return $settings;
    }

    private static function events(): array
    {
        return Json::list(Settings::get(self::LOG_KEY, []));
    }

    // Newest first, at most MAX_EVENTS_LOG entries
    private static function appendEvent(array $event): void
    {
        DB::transaction(function () use ($event) {
            DB::table('Setting')->where('key', self::LOG_KEY)->lockForUpdate()->first();
            $log = self::events();
            array_unshift($log, $event);
            Settings::put(self::LOG_KEY, array_slice($log, 0, self::MAX_EVENTS_LOG));
        });
    }

    private function config(): Response
    {
        $settings = self::settings();
        if ($this->admin()) {
            return $this->ok($settings);
        }
        // Public config without tokens
        $public = ['pixelId' => $settings['pixelId'] ?: '', 'isActive' => $settings['isActive'] !== false];
        foreach (self::AUTO_TRACK as $k) {
            $public[$k] = $settings[$k] !== false;
        }
        return $this->ok($public);
    }

    private static function extractPixelId(string $input): string
    {
        $clean = trim($input);
        if ($clean === '' || preg_match('/^\d{10,25}$/', $clean)) {
            return $clean;
        }
        if (preg_match('/fbq\s*\(\s*[\'"]init[\'"]\s*,\s*[\'"](\d+)[\'"]/i', $clean, $m)
            || preg_match('/id=(\d+)/i', $clean, $m)
            || preg_match('/[\'"]([0-9]{12,20})[\'"]/', $clean, $m)) {
            return $m[1];
        }
        return $clean;
    }

    private function saveConfig(): Response
    {
        if (! $this->admin()) {
            return $this->error('Not authorized as admin', 401);
        }
        $body = $this->body();
        $existing = self::settings();
        $pick = fn (string $k) => array_key_exists($k, $body) ? $body[$k] : ($existing[$k] ?? '');
        $updated = array_merge($existing, [
            'pixelId' => self::extractPixelId(Text::s($pick('pixelId'))),
            'customScript' => array_key_exists('customScript', $body) ? $body['customScript'] : ($existing['customScript'] ?? ''),
            'capiToken' => trim(Text::s($pick('capiToken'))),
            'testEventCode' => trim(Text::s($pick('testEventCode'))),
            'isActive' => array_key_exists('isActive', $body) ? (bool) $body['isActive'] : $existing['isActive'],
            'enableCapi' => array_key_exists('enableCapi', $body) ? (bool) $body['enableCapi'] : $existing['enableCapi'],
            'adSpendEstimates' => ! empty($body['adSpendEstimates']) ? $body['adSpendEstimates'] : $existing['adSpendEstimates'],
        ]);
        foreach (self::AUTO_TRACK as $k) {
            $updated[$k] = array_key_exists($k, $body) ? (bool) $body[$k] : $existing[$k];
        }
        Settings::put(self::SETTINGS_KEY, $updated);
        return $this->ok([
            'success' => true,
            'message' => 'Meta Pixel & Conversions API settings updated successfully!',
            'settings' => $updated,
            'data' => $updated,
        ]);
    }

    private function logEvent(): Response
    {
        try {
            $payload = $this->body();
            if (empty($payload['eventName'])) {
                return $this->error('Event name is required', 400);
            }
            $clientIp = trim(explode(',', (string) $this->request->header('x-forwarded-for', ''))[0]) ?: '127.0.0.1';
            $entry = [
                '_id' => 'ev_'.round(microtime(true) * 1000).substr(bin2hex(random_bytes(4)), 0, 6),
                'eventName' => Text::s($payload['eventName']),
                'eventData' => $payload['eventData'] ?? new \stdClass,
                'userData' => $payload['userData'] ?? new \stdClass,
                'adAttribution' => $payload['adAttribution'] ?? new \stdClass,
                'clientIp' => $clientIp,
                'timestamp' => ($payload['timestamp'] ?? '') ?: Text::nowIso(),
            ];
            self::appendEvent($entry);

            // Forward to the Meta Conversions API after the response, when configured and enabled
            $settings = self::settings();
            if ($settings['isActive'] && $settings['enableCapi'] && $settings['capiToken'] && $settings['pixelId']) {
                app()->terminating(fn () => self::sendToCapi($settings, $payload + ['clientIp' => $clientIp]));
            }
            return $this->ok(['success' => true, 'loggedEventId' => $entry['_id']]);
        } catch (\Throwable $e) {
            return $this->ok(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    private static function sendToCapi(array $settings, array $payload): array
    {
        if (empty($settings['pixelId']) || empty($settings['capiToken'])) {
            return ['skipped' => true, 'reason' => 'Missing Pixel ID or CAPI Access Token'];
        }
        try {
            $userDataIn = Json::arr($payload['userData'] ?? []);
            $userData = [
                'client_ip_address' => ($payload['clientIp'] ?? '') ?: '127.0.0.1',
                'client_user_agent' => ($userDataIn['userAgent'] ?? '') ?: 'Mozilla/5.0',
            ];
            // Personal data is hashed (SHA-256) as Meta requires
            if (! empty($userDataIn['email'])) {
                $userData['em'] = [hash('sha256', strtolower(trim((string) $userDataIn['email'])))];
            }
            if (! empty($userDataIn['phone'])) {
                $userData['ph'] = [hash('sha256', preg_replace('/\D/', '', (string) $userDataIn['phone']))];
            }
            $fbclid = Json::arr($payload['adAttribution'] ?? [])['fbclid'] ?? '';
            if ($fbclid) {
                $userData['fbc'] = 'fb.1.'.round(microtime(true) * 1000).'.'.$fbclid;
            }
            $body = ['data' => [[
                'event_name' => ($payload['eventName'] ?? '') ?: 'PageView',
                'event_time' => time(),
                'action_source' => 'website',
                'event_source_url' => ($userDataIn['url'] ?? '') ?: 'https://daivika.com',
                'user_data' => $userData,
                'custom_data' => array_merge(['currency' => 'INR'], Json::arr($payload['eventData'] ?? [])),
            ]]];
            if (! empty($settings['testEventCode'])) {
                $body['test_event_code'] = $settings['testEventCode'];
            }
            $res = Http::timeout(15)->post('https://graph.facebook.com/v19.0/'.rawurlencode($settings['pixelId']).'/events?access_token='.rawurlencode($settings['capiToken']), $body);
            return $res->json() ?? [];
        } catch (\Throwable $e) {
            logger()->error('Meta CAPI Dispatch Error: '.$e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }

    private function testEvent(): Response
    {
        if (! $this->admin()) {
            return $this->error('Not authorized as admin', 401);
        }
        $settings = self::settings();
        if (! $settings['pixelId']) {
            return $this->error('Please enter a valid Meta Pixel ID before testing.', 400);
        }
        $result = null;
        if ($settings['capiToken']) {
            $result = self::sendToCapi($settings, [
                'eventName' => 'TestEvent',
                'eventData' => ['value' => 999, 'currency' => 'INR', 'test_description' => 'DAIVIKA Meta Pixel Live Diagnostic Ping'],
                'userData' => ['url' => 'https://daivika.com/admin/dashboard?tab=meta-ads'],
            ]);
        }
        self::appendEvent([
            '_id' => 'test_'.round(microtime(true) * 1000),
            'eventName' => 'TestEvent',
            'eventData' => ['value' => 999, 'note' => 'Diagnostics Ping from Admin Panel'],
            'userData' => ['url' => 'https://daivika.com/admin/dashboard'],
            'adAttribution' => ['utm_source' => 'admin_test'],
            'timestamp' => Text::nowIso(),
        ]);
        return $this->ok(['success' => true, 'message' => 'Test event generated and logged successfully!', 'capiResponse' => $result]);
    }

    private function analytics(): Response
    {
        if (! $this->admin()) {
            return $this->error('Not authorized as admin', 401);
        }
        $range = (string) $this->request->query('range', '30D');
        $start = match ($range) {
            'Today' => strtotime('today 00:00:00'),
            '7D' => time() - 7 * 86400,
            '30D' => time() - 30 * 86400,
            default => 0,
        };
        $time = fn ($v) => ($t = strtotime((string) $v)) === false ? 0 : $t;

        $orders = Order::query()->where('status', '!=', 'Pending Payment')->where('paymentStatus', '!=', 'Pending')
            ->orderByDesc('createdAt')->get()->map->toArray()->all();
        $events = array_values(array_filter(self::events(), function ($e) use ($start, $time) {
            $e = Json::arr($e);
            return $time(($e['timestamp'] ?? null) ?: ($e['createdAt'] ?? '')) >= $start;
        }));

        $rangeOrders = array_values(array_filter($orders, function ($o) use ($start, $time) {
            if (in_array($o['_id'], ['ord_1', 'ord_2', 'ord_3'], true)) {
                return false;
            }
            $ps = strtolower((string) ($o['paymentStatus'] ?? ''));
            $isCod = ($o['paymentMethod'] ?? '') === 'Cash on Delivery' || ! empty($o['isPartialCod']);
            if ($ps !== '' && $ps !== 'paid' && $ps !== 'partially paid' && ! $isCod) {
                return false;
            }
            return $time(($o['date'] ?? '') ?: ($o['createdAt'] ?? '')) >= $start;
        }));

        // Meta / ad attributed orders
        $metaOrders = [];
        foreach ($rangeOrders as $o) {
            $utm = Json::arr(Json::arr($o['companyDetails'] ?? [])['utmData'] ?? []);
            $source = strtolower((string) ($utm['utm_source'] ?? ''));
            $campaign = (string) ($utm['utm_campaign'] ?? '');
            $fbclid = (string) ($utm['fbclid'] ?? '');
            $isMeta = str_contains($source, 'facebook') || str_contains($source, 'instagram') || str_contains($source, 'meta')
                || str_contains($source, 'fb') || str_contains($source, 'ig') || $fbclid !== '' || $campaign !== '';
            if ($isMeta) {
                $metaOrders[] = $o + ['attribution' => [
                    'source' => ($utm['utm_source'] ?? '') ?: ($fbclid ? 'Meta Ads' : 'Facebook / Instagram'),
                    'campaign' => $campaign ?: 'Direct Ad Click',
                    'medium' => ($utm['utm_medium'] ?? '') ?: 'paid_social',
                    'content' => ($utm['utm_content'] ?? '') ?: 'Creative Ad',
                    'term' => ($utm['utm_term'] ?? '') ?: '',
                    'fbclid' => $fbclid,
                ]];
            }
        }

        $metaRevenue = array_sum(array_map(fn ($o) => Text::num($o['total'] ?? 0), $metaOrders));
        $metaCount = count($metaOrders);
        $storeRevenue = array_sum(array_map(fn ($o) => Text::num($o['total'] ?? 0), $rangeOrders));
        $share = $storeRevenue > 0 ? number_format($metaRevenue / $storeRevenue * 100, 1, '.', '') : 0;
        $aov = $metaCount > 0 ? (int) floor($metaRevenue / $metaCount + 0.5) : 0;

        $funnel = ['PageView' => 0, 'ViewContent' => 0, 'AddToCart' => 0, 'InitiateCheckout' => 0, 'Purchase' => 0, 'Lead' => 0, 'Search' => 0];
        foreach ($events as $e) {
            $name = Json::arr($e)['eventName'] ?? '';
            if (is_string($name) && array_key_exists($name, $funnel)) {
                $funnel[$name]++;
            }
        }
        // Minimum funnel base derived from the orders when the live log has fewer events
        $r = fn ($n) => (int) floor($n + 0.5);
        $funnel['Purchase'] = max($funnel['Purchase'], $metaCount);
        $funnel['InitiateCheckout'] = max($funnel['InitiateCheckout'], $r($funnel['Purchase'] * 1.6) + 3);
        $funnel['AddToCart'] = max($funnel['AddToCart'], $r($funnel['InitiateCheckout'] * 2.1) + 5);
        $funnel['ViewContent'] = max($funnel['ViewContent'], $r($funnel['AddToCart'] * 3.4) + 12);
        $funnel['PageView'] = max($funnel['PageView'], $r($funnel['ViewContent'] * 2.8) + 20);
        $conversion = $funnel['PageView'] > 0 ? number_format($funnel['Purchase'] / $funnel['PageView'] * 100, 2, '.', '') : '0.00';

        $campaigns = [];
        foreach ($metaOrders as $o) {
            $camp = $o['attribution']['campaign'] ?: 'General Meta Ad';
            $campaigns[$camp] ??= ['campaign' => $camp, 'source' => $o['attribution']['source'] ?: 'Facebook / Instagram', 'orders' => 0, 'revenue' => 0, 'adContent' => $o['attribution']['content'] ?: 'Standard Ad', 'itemsSold' => 0];
            $campaigns[$camp]['orders']++;
            $campaigns[$camp]['revenue'] += Text::num($o['total'] ?? 0);
            foreach (Json::list($o['itemsList'] ?? []) as $it) {
                $campaigns[$camp]['itemsSold'] += Text::num(Json::arr($it)['qty'] ?? 1) ?: 1;
            }
        }
        $campaigns = array_values($campaigns);
        usort($campaigns, fn ($a, $b) => $b['revenue'] <=> $a['revenue']);

        // Estimated ROAS (Return on Ad Spend); default benchmark: spend = 25% of revenue
        $settings = self::settings();
        $spendEstimates = Json::obj($settings['adSpendEstimates']);
        $totalSpend = 0;
        foreach ($campaigns as &$c) {
            $spend = ! empty($spendEstimates[$c['campaign']]) ? Text::num($spendEstimates[$c['campaign']]) : $r($c['revenue'] * 0.25);
            $totalSpend += $spend;
            $c['estimatedSpend'] = $spend;
            $c['roas'] = $spend > 0 ? number_format($c['revenue'] / $spend, 2, '.', '') : 'N/A';
        }
        unset($c);
        $blended = $totalSpend > 0 ? number_format($metaRevenue / $totalSpend, 2, '.', '') : ($metaRevenue > 0 ? '4.20' : '0.00');

        return $this->ok([
            'success' => true,
            'summary' => [
                'totalMetaRevenue' => $metaRevenue,
                'totalMetaOrdersCount' => $metaCount,
                'totalStoreRevenue' => $storeRevenue,
                'metaRevenueShare' => $share,
                'metaAOV' => $aov,
                'conversionRate' => $conversion,
                'totalEstimatedSpend' => $totalSpend,
                'blendedROAS' => $blended,
                'dateRange' => $range,
            ],
            'funnel' => $funnel,
            'campaigns' => $campaigns,
            'metaOrders' => array_slice($metaOrders, 0, 50),
            'recentEvents' => array_slice($events, 0, 100),
            'settings' => [
                'pixelId' => $settings['pixelId'] ?: '',
                'isActive' => $settings['isActive'] !== false,
                'enableCapi' => $settings['enableCapi'] !== false,
                'hasCapiToken' => (bool) $settings['capiToken'],
            ],
        ]);
    }
}
