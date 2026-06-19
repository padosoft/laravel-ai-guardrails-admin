<?php

declare(strict_types=1);

namespace Padosoft\LaravelAiGuardrailsAdmin\Tests\Feature;

use Orchestra\Testbench\Attributes\WithConfig;
use Padosoft\LaravelAiGuardrailsAdmin\Tests\TestCase;

#[WithConfig('ai-guardrails-admin.middleware', ['web'], defer: false)]
final class PanelMountTest extends TestCase
{
    public function test_panel_mounts_at_default_prefix(): void
    {
        $this->get('/admin/ai-guardrails')
            ->assertOk()
            ->assertSee('agr-root')
            ->assertSee('window.__AI_GUARDRAILS_ADMIN__', false);
    }

    public function test_catch_all_serves_deep_links(): void
    {
        $this->get('/admin/ai-guardrails/audit')->assertOk()->assertSee('agr-root');
    }

    public function test_runtime_config_normalizes_blank_and_wrapped_values(): void
    {
        config()->set('ai-guardrails-admin.api_base', ' /custom/api/ ');
        config()->set('ai-guardrails-admin.theme_default', 'invalid');
        $html = (string) $this->get('/admin/ai-guardrails')->getContent();
        $this->assertStringContainsString('"api_base":"/custom/api"', $html);   // trimmed, no trailing slash
        $this->assertStringContainsString('"theme_default":"dark"', $html);     // invalid → default
    }
}
