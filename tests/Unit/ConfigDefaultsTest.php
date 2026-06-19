<?php

declare(strict_types=1);

namespace Padosoft\LaravelAiGuardrailsAdmin\Tests\Unit;

use PHPUnit\Framework\TestCase;

final class ConfigDefaultsTest extends TestCase
{
    public function test_default_config_values_are_stable(): void
    {
        $config = require __DIR__.'/../../config/ai-guardrails-admin.php';

        self::assertSame('admin/ai-guardrails', $config['mount_prefix']);
        self::assertSame(['web', 'auth'], $config['middleware']);
        self::assertSame('/ai-guardrails/api', $config['api_base']);
        self::assertSame('dark', $config['theme_default']);
        self::assertSame('vendor/ai-guardrails-admin', $config['asset_path']);
    }

    public function test_middleware_fallback_to_web_when_env_blank(): void
    {
        // Temporarily set env to simulate blank middleware
        $original = getenv('AI_GUARDRAILS_ADMIN_MIDDLEWARE');
        putenv('AI_GUARDRAILS_ADMIN_MIDDLEWARE=');

        $config = require __DIR__.'/../../config/ai-guardrails-admin.php';
        self::assertSame(['web'], $config['middleware']);

        // Restore
        if ($original === false) {
            putenv('AI_GUARDRAILS_ADMIN_MIDDLEWARE');
        } else {
            putenv('AI_GUARDRAILS_ADMIN_MIDDLEWARE='.$original);
        }
    }
}
