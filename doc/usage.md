# Getting Started

First, decide whether you will be using it Client Side or Server Side, we offer an NPM package and a precompiled script using webpack. If using the Client Side script, exclude all the import statements, and make sure to include the script in the page.

## Table of Contents

- [Getting Started](#getting-started)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
  - [Usage](#usage)
    - [Autoparsing URLs](#autoparsing-urls)
    - [Adding Emoji](#adding-emoji)
  - [Creating new tags](#creating-new-tags)
    - [Simple Tags](#simple-tags)
    - [Enhanced Tags](#enhanced-tags)
    - [Callback Tags](#callback-tags)

## Installation

```shell
npm install nbbcjs
```

## Usage

For our first example, we first import the Library and parse a simple bbcode input.

```ts
import BBCode from 'nbbcjs';

const bbcode = new BBCode();
const text = bbcode.parse(`[b]Hello World![/b]`);

console.log(text);
//Output: <b>Hello World!</b>
```

### Autoparsing URLs

Now what if we wanted URLs to automatically be parsed?

```ts
import BBCode from 'nbbcjs';

const bbcode = new BBCode();
bbcode.setDetectURLs(true);
const text = bbcode.parse(`https://questioncove.com`);

console.log(text);
//Output: <a href="https://questioncove.com/">https://questioncove.com</a>
```

The above example automatically detects all URLs and converts them to HTML.

Additionally, you can set the template for URLs like this:

```ts
bbcode.setURLPattern('<a href="{$url/h}">{$text/h}</a>');
```

### Adding Emoji

Now what if we wanted to add new Emoji (Emoticons/Smileys), we could do that with the addEmoji API!

```ts
bbcode.addEmoji(":monkas:", "monkas.png");
```

The above would add an Emoji to the parser for the text `:monkas:` that would go to the image `./monkas.png`

## Creating new tags

### Simple Tags

Lets say we wanted to add a simple tag that wraps the text in \<tt>\</tt> for monospace, we could add that tag like this:

```ts
bbcode.addRule('mono', {
    simple_start: '<tt>',
    simple_end: '</tt>',
    class: 'inline',
    allow_in: ['listitem', 'block', 'columns', 'inline', 'link']
});
```

In this example we are adding a rule called mono that would be activated with `[mono]text[/mono]`, which would evaluate to `<tt>text</tt>`.

The four parameters given here are:

- simple_start: This describes some HTML to be added in place of the starting [mono] tag. In this case, we're going to replace it with the \<tt> HTML element.
- simple_end: This describes some HTML to be added in place of the ending [/mono] tag. In this case, we're going to replace it with the \</tt> HTML element terminator.
- class: This assigns this new rule and its contents to be of a certain "class" of data within the document. Classes control which tags are allowed to go inside which other tags, and ensure that the resulting HTML is legal and valid. The standard classes are: block, inline, list, listitem, link, columns, nextcol, code, and image. (See the appendix on content classes for more details.) In this case, our new tag will be of class inline; inline is used to describe a chunk of text in a paragraph. Most tags that change the appearance of text, like [b] and [i] and [font], are of class inline also.
- allow_in: This is a list of which tag classes this new tag may be used inside. It can be safely used inside list items, like [*], inside block items like [center], and inside other inline items, like [b]. For a complete list of the tag classes and how they relate to each other, see the appendix on content classes.

### Enhanced Tags

Now, lets say you wanted a more advanced tag that allows users to create a border around text.

You first would have to add BBMode to the imports, as it will be used later in the rule.

```ts
import BBCode, { BBMode } from 'nbbcjs';
```

Now let's say we had the following input:

```bbcode
[border color=blue size=2]This has a blue border![/border]
```

A basic way to convert that would be the following rule:

```ts
bbcode.addRule('border', {
    mode: BBMode.ENHANCED,
    template: '<div style="border: {$size}px solid {$color}">{$_content}</div>',
    class: 'block',
    allow_in: ['listitem', 'block', 'columns']
});
```

Like earlier, we have class and allow_in, but now we also have template and mode. `mode` indicates to the parser what mode it should operate in, in this case `ENHANCED`. The template is an HTML template with available replacements/arguments. We allow for size and color as replacements with this rule.

However, we do not have any validation on the input, so this could lead to issues with size being defined for the text, for instance. So now lets add some validation to the inputs:

```ts
bbcode.addRule('border', {
    mode: BBMode.ENHANCED,
    allow: {
        color: '/^#[0-9a-fA-F]+|[a-zA-Z]+$/',
        size: '/^[1-9][0-9]*$/',
    },
    template: '<div style="border: {$size}px solid {$color}">{$_content}</div>',
    class: 'block',
    allow_in: ['listitem', 'block', 'columns']
});
```

This will validate the inputs color and size to make sure it equals the regex provided.

Next, what about default values? Currently if a user inputs a color, but not a size, nothing will display. Let's fix that by adding default values like so:

```ts
bbcode.addRule('border', {
    mode: BBMode.ENHANCED,
    allow: {
        color: '/^#[0-9a-fA-F]+|[a-zA-Z]+$/',
        size: '/^[1-9][0-9]*$/'
    },
    default: {
        color: "black",
        size: "1"
    },
    template: '<div style="border: {$size}px solid {$color}">{$_content}</div>',
    class: 'block',
    allow_in: ['listitem', 'block', 'columns']
});
```

Now this has the defaults for color and size.

### Callback Tags

If the default `ENHANCED` mode isn't enough for you, you can also operate in `CALLBACK` mode, this will allow you to do additional validation or customization to the tag and template.

First, we need to import BBAction and BBMode, BBAction will be used in our callback function to determine the current action and respond accordingly:

```ts
import BBCode, { BBMode, BBAction } from 'nbbcjs';
```

Now we can setup the tag in callback mode:

```ts
bbcode.addRule('border', {
    mode: BBMode.CALLBACK,
    callback: function doBorder(bbcode, action, name, value, params, content) {...},
    class: 'block',
    allow_in: ['listitem', 'block', 'columns']
});
```

This will call the callback function with the following parameters:

- bbcode - The BBCode object that is currently doing the parsing.
- action - Always one of BBAction.CHECK or BBAction.OUTPUT, provided to indicate why this function was called and what it should return.
- name - The tag name: In the [border] example, this would contain the string "border".
- value - The default value of the tag. If the user were to type [border=1 color=red], the default value would be "1".
- params - The parameters of the tag, some given by the user, some generated by NBBC, stored in an array of key => value pairs. In the example of [border=1 color=red]Hello[/border], this array might contain:
  - '_name' => 'border'
  - '_default' => '1'
  - 'color' => 'red'
- content - Only valid when `action` is `BBAction.OUTPUT`, this is the content (body) of the tag, already converted to valid HTML. In the example of [border=1 color=red]Hello[/border], `content` would contain the string "Hello".

An example implentation of the doBorder function would look like

```ts
function doBorder(bbcode, action, name, value, params, content) {
    if (action == BBAction.CHECK) {
        if (value && !(/^#[0-9a-fA-F]+|[a-zA-Z]+$/.test(value)))
            return false;
        if (params.color && !(/^#[0-9a-fA-F]+|[a-zA-Z]+$/.test(params.color)))
            return false;
        if (params.size && !(/^[1-9][0-9]*$/.test(params.size)))
            return false;
        return true;
    }

    const color = value ? value : params.color ? params.color : "black";
    const size = params.size ? params.size : 1;
    return `<div style="border: ${size}px solid ${color}">${content}</div>`;
}
```

The above function will check the values of color and size to make sure they are correct, or use default values for color and size, and then returns the HTML for the border. In the above case it also uses the default value as color if present.
