<?php

namespace App\Http\Controllers\Api;

use App\Models\Banner;
use App\Models\ContactMessage;
use App\Models\Newsletter;
use App\Models\Order;
use App\Services\AdminNotifier;
use App\Services\Pincode;
use App\Services\RateLimit;
use App\Services\Settings;
use App\Services\VendorRouting;
use App\Support\Json;
use App\Support\Text;
use Symfony\Component\HttpFoundation\Response;

// GET  /api/public/banners, /settings, /bestsellers, /pincode/:pin
// POST /api/public/contact, /newsletter
class PublicController extends ApiController
{
    private const PRIVATE_SETTING_KEYS = ['meta_pixel_settings', 'meta_pixel_events_log', 'vendor_system'];

    protected function handle(string $method): Response
    {
        $action = $this->seg(0);
        if ($method === 'GET') {
            return match ($action) {
                'bestsellers' => $this->bestsellers(),
                'banners' => $this->banners(),
                'pincode' => $this->pincode(),
                'settings' => $this->settings(),
                default => $this->notFound(),
            };
        }
        if ($method === 'POST') {
            if ($limited = RateLimit::hit("public:$action:".$this->ip(), 10, 15 * 60 * 1000)) {
                return $limited;
            }
            try {
                return match ($action) {
                    'contact' => $this->contact(),
                    'newsletter' => $this->newsletter(),
                    default => $this->notFound(),
                };
            } catch (\Throwable $e) {
                report($e);
                return $this->error($e->getMessage(), 500);
            }
        }
        return $this->notFound();
    }

    // [{ productId, sold }] by units sold in confirmed orders
    private function bestsellers(): Response
    {
        try {
            $sold = [];
            $orders = Order::query()->where('status', '!=', 'Pending Payment')->where('status', '!=', 'Cancelled')
                ->where('paymentStatus', '!=', 'Pending')->get(['itemsList']);
            foreach ($orders as $o) {
                foreach (Json::list($o->itemsList) as $it) {
                    $it = Json::arr($it);
                    if (! empty($it['isFreeGift'])) {
                        continue;
                    }
                    $id = Text::s($it['productId'] ?? ($it['_id'] ?? ''));
                    if ($id !== '') {
                        $sold[$id] = ($sold[$id] ?? 0) + (Text::parseInt($it['qty'] ?? ($it['quantity'] ?? 1)) ?: 1);
                    }
                }
            }
            $rows = [];
            foreach ($sold as $productId => $count) {
                $rows[] = ['productId' => (string) $productId, 'sold' => $count];
            }
            usort($rows, fn ($a, $b) => $b['sold'] <=> $a['sold']);
            return $this->ok(array_slice($rows, 0, 24))->header('Cache-Control', 'public, max-age=300');
        } catch (\Throwable $e) {
            report($e);
            return $this->ok([]);
        }
    }

    private function banners(): Response
    {
        $isLegacyDummy = function ($url) {
            if (! is_string($url) || $url === '') {
                return true;
            }
            $u = strtolower($url);
            foreach (['/assets/b1', '/assets/b2', '/assets/b3', '/assets/slide', 'unsplash.com'] as $bad) {
                if (str_contains($u, $bad)) {
                    return true;
                }
            }
            return false;
        };
        $list = [];
        foreach (Banner::query()->orderBy('createdAt')->get() as $b) {
            $arr = $b->toArray();
            $img = $isLegacyDummy($arr['image']) ? '' : $arr['image'];
            $mob = $isLegacyDummy($arr['mobileImage']) ? '' : $arr['mobileImage'];
            $arr['image'] = $img ?: $mob;
            $arr['mobileImage'] = $mob ?: $img;
            if ($arr['image'] || $arr['mobileImage']) {
                $list[] = $arr;
            }
        }
        return $this->ok($list)->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    }

    // { state, district, city } for checkout address autofill
    private function pincode(): Response
    {
        if ($limited = RateLimit::hit('public:pincode:'.$this->ip(), 60, 15 * 60 * 1000)) {
            return $limited;
        }
        try {
            $found = Pincode::lookup((string) ($this->seg(1) ?? ''));
            if (! $found) {
                return $this->error('PIN code not found', 404);
            }
            return $this->ok($found)->header('Cache-Control', 'public, max-age=86400');
        } catch (\Throwable $e) {
            return $this->error('PIN code lookup is unavailable right now', 503);
        }
    }

    // Settings the storefront never needs (API tokens, event logs, internal vendor config) stay private
    private function settings(): Response
    {
        try {
            $result = [];
            foreach (Settings::all() as $key => $value) {
                $key = (string) $key;
                if (in_array($key, self::PRIVATE_SETTING_KEYS, true) || preg_match('/secret|token|password|_log$/i', $key)) {
                    continue;
                }
                $result[$key] = $value;
            }
            return $this->ok(Json::object($result));
        } catch (\Throwable $e) {
            report($e);
            return $this->ok(['free_shipping_threshold' => 600]);
        }
    }

    private function contact(): Response
    {
        $body = $this->body();
        $name = Text::s($body['name'] ?? '');
        $email = Text::s($body['email'] ?? '');
        $message = Text::s($body['message'] ?? '');
        $subject = Text::s($body['subject'] ?? '') ?: 'General Inquiry';
        if ($name === '' || $email === '' || $message === '') {
            return $this->error('Please provide all required fields (Name, Email, and Message).', 400);
        }
        $row = ContactMessage::query()->create([
            'name' => mb_substr($name, 0, 200),
            'email' => mb_substr($email, 0, 200),
            'phone' => mb_substr(Text::s($body['phone'] ?? ''), 0, 30),
            'subject' => mb_substr($subject, 0, 300),
            'message' => mb_substr($message, 0, 5000),
        ]);
        AdminNotifier::notify(
            'New Lead Message 💬',
            "Inquiry from $name ($email) on \"$subject\": \"".Text::truncate($message, 60).'"',
            'new_lead',
            '/admin/dashboard?tab=leads-inbox'
        );
        return $this->ok($row->fresh()->toArray(), 201, ['message' => 'Your inquiry has been received! Our concierge team will contact you shortly.']);
    }

    private function newsletter(): Response
    {
        $email = strtolower(trim(Text::s($this->body()['email'] ?? '')));
        if ($email === '') {
            return $this->error('Please provide a valid email address.', 400);
        }
        if (Newsletter::query()->where('email', $email)->exists()) {
            return $this->error('This email is already subscribed to our luxury drops!', 400);
        }
        $row = Newsletter::query()->create(['email' => mb_substr($email, 0, 200)]);
        AdminNotifier::notify(
            'New Newsletter Subscriber 📧',
            "$email subscribed to Daivika premium drop announcements.",
            'new_subscriber',
            '/admin/dashboard?tab=leads-inbox'
        );
        return $this->ok($row->fresh()->toArray(), 201, ['message' => 'Successfully subscribed to Daivika premium drop announcements!']);
    }
}
