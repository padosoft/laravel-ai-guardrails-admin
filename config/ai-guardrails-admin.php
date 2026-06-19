<?php

declare(strict_types=1);

$middleware = array_values(array_filter(
    array_map('trim', explode(',', (string) env('AI_GUARDRAILS_ADMIN_MIDDLEWARE', 'web,auth'))),
    static fn (string $name): bool => $name !== ''
));

return [
    'mount_prefix' => env('AI_GUARDRAILS_ADMIN_PREFIX', 'admin/ai-guardrails'),
    'middleware' => $middleware !== [] ? $middleware : ['web'],
    'api_base' => env('AI_GUARDRAILS_ADMIN_API_BASE', '/ai-guardrails/api'),
    'theme_default' => env('AI_GUARDRAILS_ADMIN_THEME', 'dark'),
    'asset_path' => env('AI_GUARDRAILS_ADMIN_ASSET_PATH', 'vendor/ai-guardrails-admin'),
];
