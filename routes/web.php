<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Padosoft\LaravelAiGuardrailsAdmin\Http\Controllers\PanelController;

$prefix = trim((string) config('ai-guardrails-admin.mount_prefix', 'admin/ai-guardrails'), '/');
$middleware = config('ai-guardrails-admin.middleware', ['web']);
$middleware = is_array($middleware) && $middleware !== [] ? array_values($middleware) : ['web'];

Route::middleware($middleware)
    ->prefix($prefix)
    ->group(static function (): void {
        Route::get('/{any?}', PanelController::class)
            ->where('any', '.*')
            ->name('ai-guardrails-admin.panel');
    });
