<?php

declare(strict_types=1);

/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2013 Jonathan Vollebregt (jnvsor@gmail.com), Rokas Šleinius (raveren@gmail.com)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

namespace Kint\Renderer;

use Kint\Zval\InstanceValue;
use Kint\Zval\Value;

/**
 * @psalm-type PluginMap = array<string, class-string>
 *
 * I'd like to have PluginMap<T> but can't:
 * Psalm bug #4308
 */
abstract class AbstractRenderer implements ConstructableRendererInterface
{
    public const SORT_NONE = 0;
    public const SORT_VISIBILITY = 1;
    public const SORT_FULL = 2;

    public static ?string $js_nonce = null;
    public static ?string $css_nonce = null;

    protected array $call_info = [];
    protected array $statics = [];
    protected bool $show_trace = true;
    protected bool $render_spl_ids = true;

    public function __construct()
    {
    }

    public function shouldRenderObjectIds(): bool
    {
        return $this->render_spl_ids;
    }

    public function setCallInfo(array $info): void
    {
        if (!\is_array($info['modifiers'] ?? null)) {
            $info['modifiers'] = [];
        }

        if (!\is_array($info['trace'] ?? null)) {
            $info['trace'] = [];
        }

        $this->call_info = [
            'params' => $info['params'] ?? null,
            'modifiers' => $info['modifiers'],
            'callee' => $info['callee'] ?? null,
            'caller' => $info['caller'] ?? null,
            'trace' => $info['trace'],
        ];
    }

    public function getCallInfo(): array
    {
        return $this->call_info;
    }

    public function setStatics(array $statics): void
    {
        $this->statics = $statics;
        $this->setShowTrace(!empty($statics['display_called_from']));
    }

    public function getStatics(): array
    {
        return $this->statics;
    }

    public function setShowTrace(bool $show_trace): void
    {
        $this->show_trace = $show_trace;
    }

    public function getShowTrace(): bool
    {
        return $this->show_trace;
    }

    public function filterParserPlugins(array $plugins): array
    {
        return $plugins;
    }

    public function preRender(): string
    {
        return '';
    }

    public function postRender(): string
    {
        return '';
    }

    public static function sortPropertiesFull(Value $a, Value $b): int
    {
        $sort = Value::sortByAccess($a, $b);
        if ($sort) {
            return $sort;
        }

        $sort = Value::sortByName($a, $b);
        if ($sort) {
            return $sort;
        }

        if (null === $a->owner_class || null === $b->owner_class) {
            return $sort;
        }

        return InstanceValue::sortByHierarchy($a->owner_class, $b->owner_class);
    }

    /**
     * Sorts an array of Value.
     *
     * @param Value[] $contents Object properties to sort
     *
     * @return Value[]
     */
    public static function sortProperties(array $contents, int $sort): array
    {
        switch ($sort) {
            case self::SORT_VISIBILITY:
                // Containers to quickly stable sort by type
                $containers = [
                    Value::ACCESS_PUBLIC => [],
                    Value::ACCESS_PROTECTED => [],
                    Value::ACCESS_PRIVATE => [],
                    Value::ACCESS_NONE => [],
                ];

                foreach ($contents as $item) {
                    $containers[$item->access][] = $item;
                }

                return \array_merge(...$containers);
            case self::SORT_FULL:
                \usort($contents, [self::class, 'sortPropertiesFull']);
                // no break
            default:
                return $contents;
        }
    }
}
