<?php

declare(strict_types=1);

namespace Padosoft\LaravelAiGuardrailsAdmin\Http\Controllers;

use Illuminate\Contracts\View\View;
use Illuminate\Routing\Controller;

final class PanelController extends Controller
{
    private const DEFAULT_API_BASE = '/ai-guardrails/api';

    private const DEFAULT_MOUNT_PREFIX = 'admin/ai-guardrails';

    private const DEFAULT_ASSET_PATH = 'vendor/ai-guardrails-admin';

    public function __invoke(): View
    {
        return view('ai-guardrails-admin::panel', [
            'runtimeConfig' => [
                'api_base' => $this->apiBase(),
                'mount_prefix' => $this->mountPrefix(),
                'theme_default' => $this->themeDefault(),
                'asset_path' => $this->trimmedPath('asset_path', self::DEFAULT_ASSET_PATH),
            ],
        ]);
    }

    private function apiBase(): string
    {
        $base = rtrim($this->stringConfig('api_base', self::DEFAULT_API_BASE), '/');

        return $base === '' ? self::DEFAULT_API_BASE : $base;
    }

    private function mountPrefix(): string
    {
        return trim((string) config('ai-guardrails-admin.mount_prefix', self::DEFAULT_MOUNT_PREFIX), '/');
    }

    private function trimmedPath(string $key, string $default): string
    {
        $path = trim($this->stringConfig($key, $default), '/');

        return $path === '' ? $default : $path;
    }

    private function themeDefault(): string
    {
        $theme = strtolower($this->stringConfig('theme_default', 'dark'));

        return in_array($theme, ['dark', 'light'], true) ? $theme : 'dark';
    }

    private function stringConfig(string $key, string $default): string
    {
        $value = trim((string) config("ai-guardrails-admin.{$key}", $default));

        return $value === '' ? $default : $value;
    }
}
