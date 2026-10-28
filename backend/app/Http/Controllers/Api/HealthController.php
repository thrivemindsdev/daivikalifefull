<?php

namespace App\Http\Controllers\Api;

use App\Support\Api;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

// GET /api/health — is the API connected to its database?
class HealthController
{
    public function __invoke(): Response
    {
        $configured = (bool) (config('database.connections.pgsql.url') || env('DB_HOST'));
        try {
            DB::connection()->getPdo();
            DB::select('SELECT 1');
            $connected = true;
        } catch (\Throwable $e) {
            logger()->error('Health check: database unreachable: '.$e->getMessage());
            $connected = false;
        }
        return Api::json([
            'status' => $connected ? 'ok' : 'degraded',
            'database' => $connected ? 'connected' : ($configured ? 'unreachable' : 'not-configured'),
            'time' => gmdate('Y-m-d\TH:i:s.v\Z'),
        ], $connected ? 200 : 503, ['Cache-Control' => 'no-store']);
    }
}
