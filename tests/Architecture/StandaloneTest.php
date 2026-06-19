<?php

declare(strict_types=1);

namespace Padosoft\LaravelAiGuardrailsAdmin\Tests\Architecture;

use PHPUnit\Framework\TestCase;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use SplFileInfo;

final class StandaloneTest extends TestCase
{
    /**
     * @var list<string>
     */
    private const FORBIDDEN_NEEDLES = [
        'Padosoft\AiGuardrails\\',
    ];

    public function test_src_does_not_reference_core_package_namespace(): void
    {
        $root = dirname(__DIR__, 2);
        $paths = [
            $root.'/src',
        ];

        foreach ($this->files($paths) as $file) {
            $contents = (string) file_get_contents($file);

            foreach (self::FORBIDDEN_NEEDLES as $needle) {
                self::assertStringNotContainsString($needle, $contents, sprintf('%s leaked into %s', $needle, $file));
            }
        }
    }

    public function test_composer_does_not_hard_require_core_package(): void
    {
        $composer = json_decode((string) file_get_contents(dirname(__DIR__, 2).'/composer.json'), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($composer);

        $hardDependencies = array_merge(
            $this->stringKeys($composer['require'] ?? []),
        );

        foreach ($hardDependencies as $dependency) {
            self::assertNotSame('padosoft/laravel-ai-guardrails', $dependency, 'Core package must be in suggest, not require.');
        }
    }

    /**
     * @param  list<string>  $paths
     * @return list<string>
     */
    private function files(array $paths): array
    {
        $files = [];

        foreach ($paths as $path) {
            if (! is_dir($path)) {
                continue;
            }

            $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($path));

            foreach ($iterator as $file) {
                if (! $file instanceof SplFileInfo || ! $file->isFile()) {
                    continue;
                }

                $files[] = $file->getPathname();
            }
        }

        sort($files);

        return $files;
    }

    /**
     * @return list<string>
     */
    private function stringKeys(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }

        return array_values(array_filter(array_keys($value), 'is_string'));
    }
}
