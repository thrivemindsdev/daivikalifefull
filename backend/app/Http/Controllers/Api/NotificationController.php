<?php

namespace App\Http\Controllers\Api;

use App\Models\Notification;
use App\Models\User;
use App\Services\OrderPricing;
use App\Services\WebPushService;
use App\Support\Json;
use App\Support\Text;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

// GET  /api/notifications            the signed-in user's notifications (guests get two store messages)
// GET  /api/notifications/broadcast  admin: broadcast history
// POST /api/notifications/read       { notificationId } or { markAllRead: true }
// POST /api/notifications/subscribe  { subscription } web push subscription
// POST /api/notifications/broadcast  admin: { title, message, type, link } to every customer
// POST /api/notifications            { title, message, type, link, userId (admin only) }
class NotificationController extends ApiController
{
    protected function handle(string $method): Response
    {
        try {
            return match ($method) {
                'GET' => $this->get(),
                'POST' => $this->post(),
                default => $this->notFound(),
            };
        } catch (\Throwable $e) {
            report($e);
            return $this->error($e->getMessage(), 500);
        }
    }

    private function get(): Response
    {
        $user = $this->user();
        $first = $this->seg(0);

        if (! $user) {
            if ($first === 'broadcast') {
                return $this->error('Not authorized as admin', 401);
            }
            $threshold = OrderPricing::storeSettings()['freeShippingThreshold'];
            $list = [[
                '_id' => 'notif_public_1',
                'title' => 'Welcome to Daivika! 🛍️',
                'message' => 'Discover sacred essentials — Karungali, Rudraksha, crystals and pooja items — delivered across India.',
                'type' => 'general',
                'read' => false,
                'link' => '/products',
                'createdAt' => Text::nowIso(),
            ]];
            if ($threshold > 0) {
                $list[] = [
                    '_id' => 'notif_public_2',
                    'title' => 'Free Delivery 🚚',
                    'message' => 'Free shipping on orders of ₹'.self::inr($threshold).' or more.',
                    'type' => 'promotion',
                    'read' => false,
                    'link' => '/products',
                    'createdAt' => gmdate('Y-m-d\TH:i:s.000\Z', time() - 3600),
                ];
            }
            return $this->ok($list);
        }

        if ($first === 'broadcast') {
            if ($user->role !== 'admin') {
                return $this->error('Not authorized as admin', 401);
            }
            $rows = Notification::query()
                ->select('broadcastId', DB::raw('COUNT(*) AS recipient_count'), DB::raw('MAX("createdAt") AS created_at'))
                ->whereNotNull('broadcastId')->where('broadcastId', '!=', '')
                ->groupBy('broadcastId')->orderByDesc('created_at')->get();
            $grouped = [];
            foreach ($rows as $row) {
                $sample = Notification::query()->where('broadcastId', $row->broadcastId)->orderByDesc('createdAt')->first();
                $grouped[] = [
                    'broadcastId' => $row->broadcastId,
                    'title' => $sample?->title,
                    'message' => $sample?->message,
                    'link' => $sample?->link,
                    'type' => $sample?->type,
                    'recipientCount' => (int) $row->recipient_count,
                    'createdAt' => $sample ? $sample->toArray()['createdAt'] : null,
                ];
            }
            return $this->ok($grouped);
        }

        $list = Notification::query()->where('targetUserId', $user->id)->orderByDesc('createdAt')->get();
        if ($list->isEmpty()) {
            try {
                foreach ([
                    ['title' => 'Welcome to Daivika! 🎉', 'message' => 'Thank you for joining Daivika. Explore our premium collection today!', 'type' => 'welcome'],
                    ['title' => 'Exclusive 10% OFF 🏷️', 'message' => 'Use code DAIVIKA10 to get 10% instant discount on your order.', 'type' => 'promotion'],
                ] as $n) {
                    Notification::query()->create($n + ['targetUserId' => $user->id, 'isRead' => false, 'link' => '/']);
                }
                $list = Notification::query()->where('targetUserId', $user->id)->orderByDesc('createdAt')->get();
            } catch (\Throwable $e) {
                logger()->error('Failed to seed user default notifications: '.$e->getMessage());
            }
        }
        return $this->ok($list->map->toArray()->all());
    }

    // 600 -> "600", 1500 -> "1,500", 150000 -> "1,50,000" (Indian digit grouping)
    private static function inr(float|int $n): string
    {
        $whole = (string) (int) floor($n);
        $frac = $n - floor($n);
        if (strlen($whole) > 3) {
            $last3 = substr($whole, -3);
            $rest = substr($whole, 0, -3);
            $rest = preg_replace('/\B(?=(\d{2})+(?!\d))/', ',', $rest);
            $whole = "$rest,$last3";
        }
        return $frac > 0 ? $whole.ltrim(rtrim(number_format($frac, 2, '.', ''), '0'), '0') : $whole;
    }

    private function post(): Response
    {
        $user = $this->user();
        $body = $this->body();
        $first = $this->seg(0);

        if ($first === 'read') {
            if (! $user) {
                return $this->ok(['success' => true, 'message' => 'Notifications marked as read']);
            }
            if (! empty($body['markAllRead'])) {
                Notification::query()->where('targetUserId', $user->id)->where('isRead', false)->update(['isRead' => true, 'updatedAt' => now()]);
            } elseif (! empty($body['notificationId'])) {
                Notification::query()->whereKey(Text::s($body['notificationId']))->where('targetUserId', $user->id)->update(['isRead' => true, 'updatedAt' => now()]);
            }
            return $this->ok(['success' => true, 'message' => 'Notifications marked as read']);
        }

        if (! $user) {
            return $this->error('Not authorized', 401);
        }
        $isAdmin = $user->role === 'admin';

        if ($first === 'subscribe') {
            $sub = Json::arr($body['subscription'] ?? []);
            if (empty($sub['endpoint'])) {
                return $this->error('Missing subscription object or endpoint.', 400);
            }
            $subs = Json::list($user->pushSubscriptions);
            $exists = false;
            foreach ($subs as $s) {
                if ((Json::arr($s)['endpoint'] ?? null) === $sub['endpoint']) {
                    $exists = true;
                    break;
                }
            }
            if (! $exists) {
                $subs[] = $body['subscription'];
                $user->pushSubscriptions = $subs;
                $user->save();
            }
            return $this->ok(['success' => true, 'message' => 'Subscribed to push notifications successfully']);
        }

        if ($first === 'broadcast') {
            if (! $isAdmin) {
                return $this->error('Not authorized as admin', 401);
            }
            $title = Text::s($body['title'] ?? '');
            $message = Text::s($body['message'] ?? '');
            if ($title === '' || $message === '') {
                return $this->error('Missing title or message.', 400);
            }
            $broadcastId = 'bcast_'.round(microtime(true) * 1000);
            $type = Text::s($body['type'] ?? '') ?: 'general';
            $link = Text::s($body['link'] ?? '');
            $userIds = User::query()->where('role', '!=', 'admin')->pluck('id')->all();
            DB::transaction(function () use ($userIds, $title, $message, $type, $link, $broadcastId) {
                foreach ($userIds as $id) {
                    Notification::query()->create(['targetUserId' => $id, 'title' => $title, 'message' => $message, 'type' => $type, 'isRead' => false, 'link' => $link, 'broadcastId' => $broadcastId]);
                }
            });
            if ($userIds && WebPushService::configured()) {
                app()->terminating(function () use ($userIds, $title, $message, $link) {
                    foreach ($userIds as $id) {
                        try {
                            WebPushService::send($id, $title, $message, $link ?: '/');
                        } catch (\Throwable) {
                        }
                    }
                });
            }
            return $this->ok(['success' => true, 'broadcastId' => $broadcastId, 'recipientCount' => count($userIds)], 201);
        }

        if ($first !== null) {
            return $this->notFound();
        }

        // A single notification (admins can address any user)
        $title = Text::s($body['title'] ?? '');
        $message = Text::s($body['message'] ?? '');
        if ($title === '' || $message === '') {
            return $this->error('Missing title or message.', 400);
        }
        $target = ($isAdmin && ! empty($body['userId'])) ? Text::s($body['userId']) : $user->id;
        $link = Text::s($body['link'] ?? '');
        $notif = Notification::query()->create([
            'targetUserId' => $target,
            'title' => $title,
            'message' => $message,
            'type' => Text::s($body['type'] ?? '') ?: 'general',
            'isRead' => false,
            'link' => $link,
        ]);
        WebPushService::sendLater($target, $title, $message, $link ?: '/');
        return $this->ok($notif->fresh()->toArray(), 201);
    }
}
