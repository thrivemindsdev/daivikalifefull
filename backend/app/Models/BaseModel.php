<?php

namespace App\Models;

use App\Support\Cuid;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Model;

// Tables created by the original Prisma schema: PascalCase table names, camelCase columns, cuid string ids
// and createdAt / updatedAt timestamps. Every record is sent with `_id` (same value as `id`), which the
// storefront uses everywhere.
abstract class BaseModel extends Model
{
    public const CREATED_AT = 'createdAt';
    public const UPDATED_AT = 'updatedAt';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $guarded = [];

    protected $dateFormat = 'Y-m-d H:i:s.v';

    protected static function booted(): void
    {
        static::creating(function (BaseModel $model) {
            if (! $model->getKey()) {
                $model->setAttribute($model->getKeyName(), Cuid::make());
            }
        });
    }

    // Dates as JavaScript's toISOString() writes them: 2026-01-31T10:20:30.123Z
    protected function serializeDate(DateTimeInterface $date): string
    {
        return $date->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d\TH:i:s.v\Z');
    }

    public function toArray(): array
    {
        $data = parent::toArray();
        return ['_id' => $this->getKey()] + $data;
    }

    // Keeps only the columns this table has (forms send extra UI-only fields)
    public function fillColumns(array $data): static
    {
        foreach ($data as $key => $value) {
            if (in_array($key, static::COLUMNS, true) && $key !== 'id') {
                $this->setAttribute($key, $value);
            }
        }
        return $this;
    }

    public const COLUMNS = [];
}
