# The New BBCode Parser JS (NBBCJS)

[![Style, Unit, and Build tests](https://github.com/QuestionCove/nbbcjs/actions/workflows/test.yml/badge.svg)](https://github.com/QuestionCove/nbbcjs/actions/workflows/test.yml)

## Table of Contents

- [Live Demo (Codepen)](https://codepen.io/QuestionCove/pen/xxQBpLd)
- [The New BBCode Parser JS (NBBCJS)](#the-new-bbcode-parser-js-nbbcjs)
  - [Overview](#overview)
  - [Usage](#usage)
  - [Changes between NBBC PHP and JS/TS](#changes-between-nbbc-php-and-jsts)
- [Introduction](./doc/introduction.md)
- [Usage](./doc/usage.md)

## Overview

NBBC is a high-speed, extensible, easy-to-use validating BBCode parser that accepts BBCode as input and generates HTML5 compliant markup as its output no matter how mangled the input. It includes built-in support for most common BBCode, as well as external-wiki support, image-library support, a standard library of Emoji (Emoticons/Smileys), and via its powerful API it can even be transformed into a validating HTML parser!

NBBC is well-tested, with its output validated against a unit-test suite with over a hundred different tests. It is written entirely in TypeScript, using clean, object-oriented code, and it is compatible Node >=16.

While flexible and powerful, NBBC is also designed to be an easy to use, and is an easy drop-in replacement for most existing BBCode-parsing solutions. In many cases, it can be implemented in your own projects with only two or three lines of code.

Unlike many open-source packages, it's well-documented, too! With over 50 printed pages of documentation, including a programmer's manual with many examples, and a fully-documented API, you'll never be lost using it.

NBBC is released under a BSD Open-Source License, and may be freely used in any project for any purpose, commercial, noncommercial, or otherwise. It was created from its author's frustration in dealing with the dubious quality of similar products.

In short, NBBC is the package you want for implementing BBCode on your site.

## Installation

In an NPM environment, you can install the library with:

```shell
npm i nbbcjs
```

Or if you are using this in a browser, we provide 4 prebuilt releases, nbbc.min.js, nbbc.js, nbbc.legacy.min.js, and nbbc.legacy.js.

- *nbbc.min.js*: Minified version of the code for production
- *nbbc.js*: Uncompressed version of the code for development
- *nbbc.legacy.min.js*: Minified version of the code transpiled to allow for most browsers for production
- *nbbc.legacy.js*: Uncompressed version of the transpiled code for development

Each version comes with optional source maps.

To use the prebuilt version, simply include the javascript file of your choice by downloading it from the releases and including it, or using unpkg:

```html
<script src="https://www.unpkg.com/nbbcjs@latest/build/dist/nbbc.min.js"></script>
```

After it's installed, refer to [Usage](#usage)

## Usage

```ts
import BBCode from 'nbbcjs';

const bbcode = new BBCode();
const text = bbcode.parse(`[b]Hello World![/b]`);

console.log(text);
//Output: <b>Hello World!</b>
```

This documentation is not yet complete, for additional documentation that doesn't exist in the other documentation files, it is highly encouraged to check out the [PHP documentation](https://nbbc.sourceforge.net/#manual) and take note of the changes listed below

## Changes between NBBC PHP and JS/TS

Major changes are mostly in the form of syntax differences between NBBC and JavaScript. Additionally most of the static class numbers have been converted to enums. This means if you had extra tags in the PHP version, you would have to change the mode, endtag, and content values to use the enums (or directly use the numbers).

You can import the enums with the package either as `{ BBEnum }` or `{ BBMode, BBType, BBAction }` in the import statement like so:

```ts
import BBCode, {BBMode, BBType, BBAction} from 'nbbcjs';
```

The usage between would, in the original example of a border, the change would be from:

```php
Array(
    'mode' => BBCODE_MODE_ENHANCED,
    'template' => '<div style="border: {$size}px solid {$color}">{$_content}</div>',
    'class' => 'block',
    'allow_in' => Array('listitem', 'block', 'columns'),
)
```

to:

```ts
{
    'mode': BBMode.ENHANCED,
    'template': '<div style="border: {$size}px solid {$color}">{$_content}</div>',
    'class': 'block',
    'allow_in': ['listitem', 'block', 'columns'],
}
```

For BBMode.CALLBACK, there is a new element called `callback`, which should be a callback function to be called, previously this would have been `method` and would have been the function name with the function existing in the global scope.

Smileys have been renamed to Emoji, and all methods now reflect this. `bbcode.getSmileys()` is now `bbcode.getEmoji()`; The css class `bbcode_smiley` has been changed to `bbcode_emoji`, among other instances of this.

## Credits

- NBBC was originally developed by [Sean Werkema](https://github.com/seanofw) in 2008-10, and most of the core code is his.  He last officially worked on it in September 2010, after which it sat dormant for a few years while he did Other Things, mostly involving Gainful Employment and Wife and Kids.  His last commit was on v1.4.5.
- [Theyak](https://github.com/theyak) imported it from SourceForge into Github in 2013, and did some maintenance work, fixing bugs and adding some minor enhancements from 2013-5.  The Git history of this repository dates back to this point, condensing the prior Subversion history to a single commit.
- The [Vanilla Forums Team](https://github.com/vanilla) did some major work to upgrade Theyak's copy of NBBC to support modern PHP 5/6/7, and they're responsible for v2.x and later versions.
- The [QuestionCove Team](https://github.com/questioncove) did some major work to port this over TypeScript. That is where this respository begins.

## License

As noted above, most of the NBBC was written by Sean Werkema and the copyright on that code remains his. There are files that also have a copyright assigned to Vanilla Forums Inc. That additional copyright only applies to the changes made by Vanilla Forums Inc.

This library will always be licensed under the BSD v2 open-source license, a copy of which can be found below:

> Copyright &copy; 2008-10, Sean Werkema. All rights reserved.
>
> Portions copyright &copy; Vanilla Forums Inc. All rights reserved.
>
> Portions copyright &copy; QuestionCove LLC. All rights reserved.
>
> Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
>
> - Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
>
> - Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
>
> THIS SOFTWARE IS PROVIDED BY SEAN WERKEMA, VANILLA FORUMS INC, AND QUESTIONCOVE LLC. "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
