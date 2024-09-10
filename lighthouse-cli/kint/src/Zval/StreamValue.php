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

namespace Kint\Zval;

use Kint\Kint;

/**
 * @psalm-import-type ValueName from Value
 */
class StreamValue extends ResourceValue
{
    /** @psalm-var array<string, true> */
    public array $hints = [
        'stream' => true,
    ];

    public ?array $stream_meta;

    /** @psalm-param ValueName $name */
    public function __construct($name, ?array $stream_meta = null)
    {
        parent::__construct($name, 'stream');
        $this->stream_meta = $stream_meta;
    }

    public function getValueShort(): ?string
    {
        if (!\is_string($this->stream_meta['uri'] ?? null)) {
            return null;
        }

        /**
         * @psalm-var string $this->stream_meta['uri']
         * Psalm bug #11052
         */
        $uri = $this->stream_meta['uri'];

        if ('/' === $uri[0] && \stream_is_local($uri)) {
            return Kint::shortenPath($uri);
        }

        return $uri;
    }
}
