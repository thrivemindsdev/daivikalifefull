<?php

namespace App\Services;

use App\Support\Jwt;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

// SMS OTP via MSG91 using the DLT registered template. OTPs are kept hashed in the cache.
class SmsOtp
{
    private const RESEND_GAP_SECONDS = 30;

    private static function expiryMinutes(): int
    {
        return (int) config('daivika.sms.otp_expiry_minutes', 5);
    }

    private static function maxAttempts(): int
    {
        return (int) config('daivika.sms.otp_max_attempts', 5);
    }

    private static function hash(string $phone, string $otp): string
    {
        return hash('sha256', "$phone:$otp:".Jwt::secret());
    }

    private static function key(string $phone): string
    {
        return "otp:$phone";
    }

    private static function sendViaMsg91(string $phone, string $otp): array
    {
        $authkey = trim((string) config('daivika.sms.api_key'));
        $sender = trim((string) config('daivika.sms.sender'));
        $templateId = trim((string) config('daivika.sms.template_id'));
        $templateText = (string) config('daivika.sms.template_text');

        if ($authkey === '' || $sender === '' || $templateId === '' || ! str_contains($templateText, '{#var#}')) {
            if (! app()->environment('production')) {
                logger()->info("[sms-otp] SMS not configured. Dev OTP for $phone: $otp");
                return ['ok' => true];
            }
            logger()->error('[sms-otp] SMS_API_KEY / DLT_SENDER_ID / DLT_OTP_TEMPLATE_ID / DLT_OTP_TEMPLATE_TEXT missing');
            return ['ok' => false, 'error' => 'OTP service is not available right now. Please login with password.'];
        }

        try {
            $res = Http::timeout(15)->get('https://control.msg91.com/api/sendhttp.php', [
                'authkey' => $authkey,
                'mobiles' => "91$phone",
                'message' => preg_replace('/\{#var#\}/', $otp, $templateText, 1),
                'sender' => $sender,
                'route' => '4',
                'country' => '91',
                'DLT_TE_ID' => $templateId,
                'response' => 'json',
            ]);
            $text = trim($res->body());
            $data = json_decode($text, true);
            $ok = is_array($data) ? (($data['type'] ?? '') === 'success') : (bool) preg_match('/^[a-f0-9]{20,}$/i', $text);
            if (! $ok) {
                logger()->error('[sms-otp] MSG91 rejected the SMS: '.mb_substr($text, 0, 300));
                return ['ok' => false, 'error' => 'Could not send OTP. Please try again later or login with password.'];
            }
            return ['ok' => true];
        } catch (\Throwable $e) {
            logger()->error('[sms-otp] MSG91 request failed: '.$e->getMessage());
            return ['ok' => false, 'error' => 'Could not send OTP. Please try again later or login with password.'];
        }
    }

    public static function send(string $phone): array
    {
        $now = time();
        $existing = Cache::get(self::key($phone));
        if (is_array($existing) && $now - $existing['sentAt'] < self::RESEND_GAP_SECONDS) {
            $wait = self::RESEND_GAP_SECONDS - ($now - $existing['sentAt']);
            return ['ok' => false, 'status' => 429, 'error' => "Please wait $wait seconds before requesting a new OTP."];
        }

        $otp = (string) random_int(100000, 999999);
        $sent = self::sendViaMsg91($phone, $otp);
        if (! $sent['ok']) {
            return ['ok' => false, 'status' => 502, 'error' => $sent['error']];
        }

        $expires = $now + self::expiryMinutes() * 60;
        Cache::put(self::key($phone), ['hash' => self::hash($phone, $otp), 'expires' => $expires, 'attempts' => 0, 'sentAt' => $now], $expires - $now + 60);
        return ['ok' => true, 'expiresInMinutes' => self::expiryMinutes()];
    }

    public static function verify(string $phone, string $otp): array
    {
        $entry = Cache::get(self::key($phone));
        if (! is_array($entry) || $entry['expires'] <= time()) {
            Cache::forget(self::key($phone));
            return ['ok' => false, 'error' => 'OTP expired. Please request a new one.'];
        }
        $entry['attempts']++;
        if (! hash_equals($entry['hash'], self::hash($phone, trim($otp)))) {
            if ($entry['attempts'] >= self::maxAttempts()) {
                Cache::forget(self::key($phone));
                return ['ok' => false, 'error' => 'Too many wrong attempts. Please request a new OTP.'];
            }
            Cache::put(self::key($phone), $entry, max(1, $entry['expires'] - time() + 60));
            $left = self::maxAttempts() - $entry['attempts'];
            return ['ok' => false, 'error' => "Incorrect OTP. $left attempt(s) left."];
        }
        Cache::forget(self::key($phone));
        return ['ok' => true];
    }
}
