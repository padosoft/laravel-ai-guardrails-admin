<?php

declare(strict_types=1);

namespace Padosoft\LaravelAiGuardrailsAdmin;

use Illuminate\Support\ServiceProvider;

final class LaravelAiGuardrailsAdminServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../config/ai-guardrails-admin.php', 'ai-guardrails-admin');
    }

    public function boot(): void
    {
        $this->loadViewsFrom(__DIR__.'/../resources/views', 'ai-guardrails-admin');
        $this->loadRoutesFrom(__DIR__.'/../routes/web.php');

        if (! $this->app->runningInConsole()) {
            return;
        }

        $this->publishes([
            __DIR__.'/../config/ai-guardrails-admin.php' => config_path('ai-guardrails-admin.php'),
        ], 'ai-guardrails-admin-config');

        $this->publishes([
            __DIR__.'/../resources/views' => resource_path('views/vendor/ai-guardrails-admin'),
        ], 'ai-guardrails-admin-views');

        $builtAssets = __DIR__.'/../public/vendor/ai-guardrails-admin';

        if (is_dir($builtAssets)) {
            $this->publishes([
                $builtAssets => public_path((string) config('ai-guardrails-admin.asset_path', 'vendor/ai-guardrails-admin')),
            ], 'ai-guardrails-admin-assets');
        }
    }
}
