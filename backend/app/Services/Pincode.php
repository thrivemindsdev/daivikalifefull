<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

// PIN code -> ['state', 'district', 'city'] using India Post's public API (api.postalpincode.in).
// Names are matched to the state/district lists the checkout uses; anything that doesn't match is left empty.
class Pincode
{
    // India Post still uses some older district names
    private const DISTRICT_ALIASES = [
        'gurgaon' => 'Gurugram',
        'bangalore' => 'Bengaluru Urban',
        'bangalorerural' => 'Bengaluru Rural',
        'mysore' => 'Mysuru',
        'belgaum' => 'Belagavi',
        'bellary' => 'Ballari',
        'bijapur' => 'Vijayapura',
        'gulbarga' => 'Kalaburagi',
        'shimoga' => 'Shivamogga',
        'tumkur' => 'Tumakuru',
        'chikmagalur' => 'Chikkamagaluru',
        'raigarh' => 'Raigad',
        'allahabad' => 'Prayagraj',
        'faizabad' => 'Ayodhya',
        'trivandrum' => 'Thiruvananthapuram',
        'calicut' => 'Kozhikode',
        'cochin' => 'Ernakulam',
    ];

    private static function normalize(mixed $s): string
    {
        $s = strtolower((string) $s);
        $s = str_replace('&', 'and', $s);
        $s = preg_replace('/\([^)]*\)/', '', $s);
        return preg_replace('/[^a-z0-9]/', '', $s);
    }

    private static function matchState(mixed $name): string
    {
        $key = self::normalize($name);
        if ($key === '') {
            return '';
        }
        foreach (IndiaDistricts::states() as $s) {
            if (self::normalize($s) === $key) {
                return $s;
            }
        }
        foreach (IndiaDistricts::states() as $s) {
            if (str_contains(self::normalize($s), $key)) {
                return $s;
            }
        }
        return '';
    }

    private static function matchDistrict(string $state, string $name): string
    {
        $key = self::normalize($name);
        if ($key === '') {
            return '';
        }
        $hit = IndiaDistricts::findDistrict($state, trim(preg_replace('/\([^)]*\)/', '', $name)));
        if (! $hit && isset(self::DISTRICT_ALIASES[$key])) {
            $hit = IndiaDistricts::findDistrict($state, self::DISTRICT_ALIASES[$key]);
        }
        return $hit && $hit['state'] === $state ? $hit['name'] : '';
    }

    // Most common value first
    private static function byFrequency(array $values): array
    {
        $counts = [];
        foreach ($values as $v) {
            if ($v !== null && $v !== '') {
                $counts[$v] = ($counts[$v] ?? 0) + 1;
            }
        }
        $keys = array_keys($counts);
        usort($keys, fn ($a, $b) => $counts[$b] <=> $counts[$a]);
        return array_map('strval', $keys);
    }

    public static function lookup(string $pin): ?array
    {
        if (! preg_match('/^[1-9]\d{5}$/', $pin)) {
            return null;
        }
        $cacheKey = "pincode:$pin";
        if (Cache::has($cacheKey)) {
            return Cache::get($cacheKey) ?: null;
        }

        $res = Http::timeout(6)->get("https://api.postalpincode.in/pincode/$pin");
        if (! $res->ok()) {
            throw new RuntimeException('PIN lookup failed ('.$res->status().')');
        }
        $json = $res->json();
        $offices = (is_array($json) && ($json[0]['Status'] ?? '') === 'Success' && is_array($json[0]['PostOffice'] ?? null)) ? $json[0]['PostOffice'] : [];

        $result = null;
        if ($offices) {
            $state = self::matchState(self::byFrequency(array_column($offices, 'State'))[0] ?? '');
            $district = '';
            foreach (self::byFrequency(array_column($offices, 'District')) as $d) {
                $district = $state !== '' ? self::matchDistrict($state, $d) : '';
                if ($district !== '') {
                    break;
                }
            }
            $office = null;
            foreach (['Head Post Office', 'Sub Post Office'] as $type) {
                foreach ($offices as $o) {
                    if (($o['BranchType'] ?? '') === $type) {
                        $office = $o;
                        break 2;
                    }
                }
            }
            $office ??= $offices[0];
            $city = trim((string) ($office['Name'] ?? '')) ?: $district;
            $result = ['state' => $state, 'district' => $district, 'city' => $city];
        }

        Cache::put($cacheKey, $result ?? false, now()->addDays(7));
        return $result;
    }
}
