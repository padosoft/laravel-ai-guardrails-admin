<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Padosoft\LaravelAiGuardrailsAdmin\Http\Controllers\PanelController;

$prefix = trim((string) config('ai-guardrails-admin.mount_prefix', 'admin/ai-guardrails'), '/');
// The config file guarantees a non-empty array, but a published/overridden config may supply []
// or a non-array value, so the defensive re-guard is kept intentionally.
$middleware = config('ai-guardrails-admin.middleware', ['web']);
$middleware = is_array($middleware) && $middleware !== [] ? array_values($middleware) : ['web'];

Route::middleware($middleware)
    ->prefix($prefix)
    ->group(static function (): void {
        Route::get('/{any?}', PanelController::class)
            ->where('any', '.*')
            ->name('ai-guardrails-admin.panel');
    });
