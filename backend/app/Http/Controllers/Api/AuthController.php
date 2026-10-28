<?php

namespace App\Http\Controllers\Api;

use App\Models\Notification;
use App\Models\User;
use App\Services\AuthService;
use App\Services\MediaStorage;
use App\Services\OrderPricing;
use App\Services\RateLimit;
use App\Services\Settings;
use App\Services\SmsOtp;
use App\Support\Json;
use App\Support\Text;
use Symfony\Component\HttpFoundation\Response;

// GET  /api/auth/me
// POST /api/auth/login, /send-otp, /verify-otp, /update-avatar, /register (closed)
// PUT  /api/auth/update-profile, /update-password
class AuthController extends ApiController
{
    private const ADMIN_USE_PASSWORD = 'This number belongs to the admin account. Please log in with your password.';
    private const ACCOUNT_EXISTS = 'An account with this mobile number already exists. Please log in with your password.';
    private const NO_ACCOUNT = 'No account found with this mobile number. Please sign up first.';
    private const ADMIN_AVATAR = 'https://ui-avatars.com/api/?name=SP&background=4caf50&color=fff&bold=true';

    protected function handle(string $method): Response
    {
        $action = $this->seg(0);

        if ($method === 'GET' && $action === 'me') {
            $user = $this->user();
            if (! $user) {
                return $this->error('Not authorized, token failed', 401);
            }
            return $this->ok(AuthService::publicUser($user));
        }

        if ($method === 'POST') {
            return match ($action) {
                'register' => $this->register(),
                'login' => $this->login(),
                'send-otp' => $this->sendOtp(),
                'verify-otp' => $this->verifyOtp(),
                'update-avatar' => $this->updateAvatar(),
                default => $this->notFound(),
            };
        }

        if ($method === 'PUT') {
            return match ($action) {
                'update-profile' => $this->updateProfile(),
                'update-password' => $this->updatePassword(),
                default => $this->notFound(),
            };
        }

        return $this->notFound();
    }

    // The admin's number from .env (ADMIN_PHONE) is never used for customer sign-up or OTP password reset
    private function isEnvAdminMobile(string $mobile): bool
    {
        $adminPhone = Text::indianMobile(AuthService::envAdmin()['phone']);
        return $adminPhone !== null && $adminPhone === $mobile;
    }

    private function loginPayload(User $user, ?string $role = null): array
    {
        return [
            '_id' => $user->id,
            'name' => $user->name,
            'email' => $user->email ?: '',
            'phone' => $user->phone ?: '',
            'role' => $role ?? $user->role,
            'avatar' => $user->avatar,
            'token' => AuthService::token($user->id),
        ];
    }

    // Customers sign up with mobile number + OTP (send-otp / verify-otp), so email / password registration is closed
    private function register(): Response
    {
        if ($limited = RateLimit::hit('register:'.$this->ip(), 10, 60 * 60 * 1000)) {
            return $limited;
        }
        return $this->error('Please sign up with your mobile number and OTP.', 400);
    }

    private function login(): Response
    {
        try {
            $body = $this->body();
            $identifier = Text::s(($body['emailOrPhone'] ?? null) ?: ($body['email'] ?? ''));
            $password = Text::s($body['password'] ?? '');
            if ($identifier === '' || $password === '') {
                return $this->error('Please provide email or mobile number, and password', 400);
            }

            $isEmail = str_contains($identifier, '@');
            $emailVal = $isEmail ? strtolower(trim($identifier)) : null;
            $phoneVal = $isEmail ? null : trim($identifier);

            if ($limited = RateLimit::hit('login-ip:'.$this->ip(), 30, 15 * 60 * 1000)
                ?? RateLimit::hit('login-id:'.($emailVal ?? $phoneVal), 10, 15 * 60 * 1000)) {
                return $limited;
            }

            // The admin logs in with ADMIN_PHONE (or ADMIN_EMAIL) + ADMIN_PASSWORD from the server's .env, through
            // the same login form as everyone else; the number matches however it is typed (spaces, +91, 0 prefix)
            $admin = AuthService::envAdmin();
            $envAdminPhone = Text::indianMobile($admin['phone']) ?? $admin['phone'];
            $typedMobile = $phoneVal !== null ? (Text::indianMobile($phoneVal) ?? $phoneVal) : null;
            $isEnvAdminLogin = $admin['configured']
                && (($emailVal !== null && $emailVal === $admin['email']) || ($typedMobile !== null && $envAdminPhone !== '' && $typedMobile === $envAdminPhone))
                && hash_equals($admin['password'], $password);

            if ($isEnvAdminLogin) {
                $user = User::query()->where('email', $admin['email'])->first()
                    ?? ($envAdminPhone !== '' && Text::indianMobile($envAdminPhone) ? User::findByMobile($envAdminPhone) : null);
                if (! $user) {
                    $user = User::query()->create([
                        'name' => $admin['name'],
                        'email' => $admin['email'],
                        'phone' => $envAdminPhone !== '' ? $envAdminPhone : null,
                        'password' => $admin['password'],
                        'role' => 'admin',
                        'avatar' => self::ADMIN_AVATAR,
                    ]);
                } else {
                    $user->role = 'admin';
                    if (! $user->matchPassword($admin['password'])) {
                        $user->password = $admin['password'];
                    }
                    // Store ADMIN_PHONE on the admin account so the number is recognised as the admin's everywhere
                    if ($envAdminPhone !== '' && Text::indianMobile($user->phone) !== $envAdminPhone) {
                        $taken = User::query()->where('phone', $envAdminPhone)->where('id', '!=', $user->id)->exists();
                        if (! $taken) {
                            $user->phone = $envAdminPhone;
                        }
                    }
                    $user->save();
                }
                return $this->ok($this->loginPayload($user, 'admin'));
            }

            // A 10-digit Indian mobile number matches however it was typed or stored (spaces, +91, 0 prefix)
            $mobile = $phoneVal !== null ? Text::indianMobile($phoneVal) : null;
            $user = ($mobile ? User::findByMobile($mobile) : null)
                ?? ($emailVal !== null ? User::query()->where('email', $emailVal)->first() : User::query()->where('phone', $phoneVal)->first());
            if ($user && $user->matchPassword($password)) {
                return $this->ok($this->loginPayload($user));
            }
            return $this->error('Invalid email/mobile number or password', 401);
        } catch (\Throwable $e) {
            report($e);
            return $this->error($e->getMessage(), 500);
        }
    }

    // OTP SMS is only used to prove the number belongs to the customer: once at sign-up and when resetting a
    // forgotten password. Regular login is mobile number + password, with no SMS.
    private function sendOtp(): Response
    {
        $body = $this->body();
        $mobile = Text::indianMobile(($body['phone'] ?? null) ?: ($body['emailOrPhone'] ?? ''));
        if (! $mobile) {
            return $this->error('Please enter a valid 10-digit mobile number', 400);
        }
        $purpose = ($body['purpose'] ?? '') === 'reset' ? 'reset' : 'signup';

        if ($limited = RateLimit::hit('otp-send-ip:'.$this->ip(), 20, 60 * 60 * 1000)
            ?? RateLimit::hit("otp-send-phone:$mobile", 5, 60 * 60 * 1000)) {
            return $limited;
        }

        // Checked before sending so no SMS is spent on a request that cannot succeed
        $account = User::findByMobile($mobile);
        if ($account?->role === 'admin' || $this->isEnvAdminMobile($mobile)) {
            return $this->error(self::ADMIN_USE_PASSWORD, 403);
        }
        if ($purpose === 'signup' && $account) {
            return $this->error(self::ACCOUNT_EXISTS, 409);
        }
        if ($purpose === 'reset' && ! $account) {
            return $this->error(self::NO_ACCOUNT, 404);
        }

        $result = SmsOtp::send($mobile);
        if (! $result['ok']) {
            return $this->error($result['error'], $result['status'] ?? 500);
        }
        return $this->ok(['phone' => $mobile, 'purpose' => $purpose, 'expiresInMinutes' => $result['expiresInMinutes']], 200, ['message' => 'OTP sent']);
    }

    // Sign-up creates the account with the chosen password; reset sets a new password. Both log the user in.
    private function verifyOtp(): Response
    {
        $body = $this->body();
        $mobile = Text::indianMobile(($body['phone'] ?? null) ?: ($body['emailOrPhone'] ?? ''));
        $otp = trim(Text::s($body['otp'] ?? ''));
        if (! $mobile || ! preg_match('/^\d{4,8}$/', $otp)) {
            return $this->error('Please enter the OTP sent to your mobile', 400);
        }
        $purpose = ($body['purpose'] ?? '') === 'reset' ? 'reset' : 'signup';

        if ($limited = RateLimit::hit('otp-verify-ip:'.$this->ip(), 30, 15 * 60 * 1000)) {
            return $limited;
        }

        // Everything the user can fix is checked before the OTP, so a typo doesn't use it up
        $account = User::findByMobile($mobile);
        if ($account?->role === 'admin' || $this->isEnvAdminMobile($mobile)) {
            return $this->error(self::ADMIN_USE_PASSWORD, 403);
        }
        if ($purpose === 'signup' && $account) {
            return $this->error(self::ACCOUNT_EXISTS, 409);
        }
        if ($purpose === 'reset' && ! $account) {
            return $this->error(self::NO_ACCOUNT, 404);
        }
        $name = mb_substr(trim(Text::s($body['name'] ?? '')), 0, 80);
        if ($purpose === 'signup' && $name === '') {
            return $this->error('Please enter your name to create your account', 400);
        }
        $password = Text::s($body['password'] ?? '');
        if (strlen($password) < 6 || strlen($password) > 128) {
            return $this->error('Password must be 6 to 128 characters long', 400);
        }

        $check = SmsOtp::verify($mobile, $otp);
        if (! $check['ok']) {
            return $this->error($check['error'], 401);
        }

        if ($purpose === 'signup') {
            $user = $this->createMobileCustomer($name, $mobile, $password);
        } else {
            $account->password = $password;
            $account->save();
            $user = $account;
        }
        return $this->ok(
            AuthService::publicUser($user) + ['token' => AuthService::token($user->id)],
            $purpose === 'signup' ? 201 : 200,
            ['message' => $purpose === 'signup' ? 'Account created' : 'Password updated']
        );
    }

    // Customer account created after the sign-up OTP is verified, with the password the customer chose
    private function createMobileCustomer(string $name, string $mobile, string $password): User
    {
        $user = User::query()->create([
            'name' => $name,
            'phone' => $mobile,
            'password' => $password,
            'role' => 'user',
            'avatar' => 'https://ui-avatars.com/api/?name='.rawurlencode($name).'&background=06241e&color=fff&bold=true',
        ]);
        try {
            Notification::query()->create([
                'targetUserId' => $user->id,
                'title' => 'Welcome to the Daivika Club! ✨',
                'message' => $this->welcomeMessage($name),
                'type' => 'welcome',
                'link' => '/products',
            ]);
        } catch (\Throwable $e) {
            logger()->warning('Failed to save welcome notification: '.$e->getMessage());
        }
        return $user->fresh();
    }

    private function welcomeMessage(string $name): string
    {
        $couponsEnabled = true;
        $coupons = array_map(fn ($c) => $c + ['category' => in_array($c['code'], ['KERALA500'], true) ? 'festival' : 'welcome'], OrderPricing::DEFAULT_COUPONS);
        try {
            if (Settings::has('coupons_enabled')) {
                $couponsEnabled = (bool) Settings::get('coupons_enabled');
            }
            if (Settings::has('coupons')) {
                $coupons = Settings::get('coupons');
            }
        } catch (\Throwable $e) {
            logger()->warning('Failed to fetch settings for welcome message: '.$e->getMessage());
        }

        $welcome = null;
        if ($couponsEnabled && is_array($coupons)) {
            foreach (Json::list($coupons) as $c) {
                $c = Json::arr($c);
                if (! empty($c['category']) && strtolower((string) $c['category']) === 'welcome') {
                    $welcome = $c;
                    break;
                }
            }
        }
        if ($welcome) {
            $value = Text::s($welcome['discountValue'] ?? '');
            $discount = ($welcome['discountType'] ?? '') === 'percentage' ? "$value%" : "₹$value";
            return "We're thrilled to have you, $name! As a welcome gift, use coupon code {$welcome['code']} at checkout to claim $discount off your first purchase. 🥂";
        }
        return "We're thrilled to have you, $name! Welcome to the Daivika Club. Explore our latest smart products and trending deals. 🥂";
    }

    private function updateAvatar(): Response
    {
        try {
            $user = $this->user();
            if (! $user) {
                return $this->error('Not authorized', 401);
            }
            $file = MediaStorage::file($this->request, 'image');
            if (! $file) {
                return $this->error('Please select an image to upload', 400);
            }
            $url = MediaStorage::store($file);
            if ($user->avatar) {
                MediaStorage::delete($user->avatar);
            }
            $user->avatar = $url;
            $user->save();
            return $this->ok(['avatar' => $user->avatar], 200, ['message' => 'Profile avatar updated successfully']);
        } catch (\Throwable $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    private function updateProfile(): Response
    {
        $user = $this->user();
        if (! $user) {
            return $this->error('Not authorized', 401);
        }
        $name = mb_substr(trim(Text::s($this->body()['name'] ?? '')), 0, 80);
        if ($name === '') {
            return $this->error('Name is required', 400);
        }
        $user->name = $name;
        $user->save();
        return $this->ok(AuthService::publicUser($user->fresh()), 200, ['message' => 'Profile updated successfully']);
    }

    private function updatePassword(): Response
    {
        $user = $this->user();
        if (! $user) {
            return $this->error('Not authorized', 401);
        }
        $body = $this->body();
        $current = Text::s($body['currentPassword'] ?? '');
        $new = Text::s($body['newPassword'] ?? '');
        if ($current === '' || $new === '') {
            return $this->error('Both current and new passwords are required', 400);
        }
        if (mb_strlen($new) < 6) {
            return $this->error('New password must be at least 6 characters', 400);
        }
        if (($user->getAttributes()['password'] ?? '') === '') {
            return $this->error('This account was created via Google / Social Sign-In and does not use a password.', 400);
        }
        if (! $user->matchPassword($current)) {
            return $this->error('Incorrect current password. Please check and try again.', 401);
        }
        $user->password = $new;
        $user->save();
        return $this->ok(null, 200, ['message' => 'Password updated successfully']);
    }
}
