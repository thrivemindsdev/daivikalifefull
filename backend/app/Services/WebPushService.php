<?php

namespace App\Services;

use App\Models\User;
use App\Support\Json;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

// Browser push notifications to a user's subscribed devices. Expired subscriptions are removed.
class WebPushService
{
    public static function configured(): bool
    {
        return (string) config('daivika.vapid.public_key') !== '' && (string) config('daivika.vapid.private_key') !== '';
    }

    public static function send(string $userId, string $title, string $message, ?string $link = '/'): array
    {
        if (! self::configured()) {
            return ['success' => false, 'error' => 'VAPID keys not configured'];
        }
        $user = User::query()->find($userId);
        $subscriptions = Json::list($user?->pushSubscriptions);
        if (! $subscriptions) {
            return ['success' => true, 'sentCount' => 0];
        }

        $webPush = new WebPush(['VAPID' => [
            'subject' => (string) config('daivika.vapid.subject'),
            'publicKey' => (string) config('daivika.vapid.public_key'),
            'privateKey' => (string) config('daivika.vapid.private_key'),
        ]], ['TTL' => 86400], 15);

        $payload = Json::encode(['title' => $title, 'body' => $message, 'link' => $link ?: '/']);
        foreach ($subscriptions as $sub) {
            $sub = Json::arr($sub);
            $keys = Json::arr($sub['keys'] ?? []);
            if (empty($sub['endpoint']) || empty($keys['p256dh']) || empty($keys['auth'])) {
                continue;
            }
            try {
                $webPush->queueNotification(Subscription::create([
                    'endpoint' => $sub['endpoint'],
                    'keys' => ['p256dh' => $keys['p256dh'], 'auth' => $keys['auth']],
                ]), $payload);
            } catch (\Throwable $e) {
                logger()->warning('Web push subscription skipped: '.$e->getMessage());
            }
        }

        $dead = [];
        $sent = 0;
        try {
            foreach ($webPush->flush() as $report) {
                if ($report->isSuccess()) {
                    $sent++;
                } elseif ($report->isSubscriptionExpired()) {
                    $dead[] = $report->getEndpoint();
                } else {
                    logger()->warning('Push delivery failed: '.$report->getReason());
                }
            }
        } catch (\Throwable $e) {
            logger()->error('Web push failed: '.$e->getMessage());
        }

        if ($dead && $user) {
            $user->pushSubscriptions = array_values(array_filter($subscriptions, fn ($s) => ! in_array(Json::arr($s)['endpoint'] ?? '', $dead, true)));
            $user->save();
        }
        return ['success' => true, 'sentCount' => $sent];
    }

    // Sends after the response has gone out, so a slow push service never delays the customer
    public static function sendLater(string $userId, string $title, string $message, ?string $link = '/'): void
    {
        if (! self::configured()) {
            return;
        }
        app()->terminating(function () use ($userId, $title, $message, $link) {
            try {
                self::send($userId, $title, $message, $link);
            } catch (\Throwable $e) {
                logger()->error('Web push failed: '.$e->getMessage());
            }
        });
    }
}
