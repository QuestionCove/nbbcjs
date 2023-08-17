import BBCode from '../src/bbcode';
import { BBStack, BBToken, BBMode, LexState, BBType, BBAction } from './enums';

/**
 * The Types for the Parsing Stack
 */
export interface StackType {
    /**
     * Token Type
     */
    [BBStack.TOKEN]: BBToken,
    /**
     * Generated HTML
     */
    [BBStack.TEXT]: string,
    /**
     * JSON respresentation of tag as {@link TagType} or @type boolean
     */
    [BBStack.TAG]: boolean | TagType
    /**
     * Tag {@link ClassType}
     */
    [BBStack.CLASS]: ClassType
}

/**
 * Private Tag Types for the parser
 */
export interface TagTypePrivate {
    /**
     * The raw verbatim text of the tag, unparsed. For example, in [font=Arial size=5]...[/font], this will contain "[font=Arial size=5]".
     */
    _tag?: string,
    /**
     * The raw verbatim text of the closing tag, unparsed. For example, in [font=Arial size=5]...[/font], this will contain "[/font]". 
     * Note that if an end tag is optional, or it's required but the user forgets to provide it, this value will still contain appropriate closing-tag text 
     * (i.e., the parser will create a suitable end tag).
     */
    _endtag?: boolean | string,
    /**
     * The name of the tag, eg "color", or "url"
     */
    _name?: string,
    /**
     * If a closing tag was provided by the user, this will be set to true; if no closing tag was provided, 
     * or this tag didn't allow a closing tag, this will be set to false. 
     * You can use this field to distinguish whether the user has provided a closing tag or not when closing tags are optional.
     */
    _hasend?: boolean,
    /**
     * A boolean value that is false if the tag is a start tag and true if the tag is an end tag.
     * Note that this will always be false for a callback function, so it's not very useful outside of NBBC's internals.
     */
    _end?: boolean,
    /**
     * The default value of the tag; in [font=Arial size=5] the default value would be "Arial".
     * If the value doesn't exist, it may be false
     */
    _default?: boolean | string,
    /**
     * The exact parameters of the tag, parsed, in list form. For example, in [font=Arial size=5], this parameter will contain this array:
     * ```json
     * [
     *   {"key": "font", "value": "Arial"},
     *   {"key": "size", "value": "5"}
     * ]
     * ```
     * While this may appear to be identical to the array that contains it, it's not. 
     * First, the 0th array element is always set to the tag's default value (even if there is no default value), 
     * and second, if redundant parameters are provided, this will list them separately. 
     * For example: [includes file="Larry" file="George" file="Bill"]
     * ```
     * [
     *   {"key": "includes", "value": "},
     *   {"key": "file", "value": "Larry},
     *   {"key": "file", "value": "George},
     *   {"key": "file", "value": "Bill"}
     * ]
     */
    _params?: Param[],
}

/**
 * Public TagTypes for extended tag processing
 * @extends TagTypePrivate
 */
export interface TagType extends TagTypePrivate {
    title?: string,
    url?: string,
    target?: string,
    content?: string,
    email?: string,
    wikiURL?: string,
    name?: string,
    date?: string,
    [publictypes: string]: string | boolean | Param[] | undefined
}

/**
 * Tag Rules Object for the format of tags in the parser
 */
export interface TagRules {
    /**
     * The Mode the tag should be operating in
     * @memberof BBMode
     * @default BBMode.SIMPLE
     */
    mode?: BBMode,
    /**
     * Simple Start tag for HTML, example \<b>
     * @default ""
     */
    simple_start?: string,
    /**
     * Simple End tag for HTML, example \</b>
     * @default ""
     */
    simple_end?: string,
    /**
     * Plain Mode Content to add at the start of the tag, example \n
     * @default ""
     */
    plain_start?: string,
    /**
     * Plain Mode Content to add at the end of the tag, example \n
     * @default ""
     */
    plain_end?: string,
    /**
     * Class for the tag, defaults are as follows:
     * 
     * **block**: A rectangular block of text, equivalent to the CSS display:block property. This is generally an outer containing class.
     * *Usually contained by: Blocks, list items, columns.*
     * *Can usually contain: Blocks, inlines, links, lists, columns, images, code*
     * 
     * **inline**: A span of text with an unusual property, like italics or boldface or a color change. This is generally an innermost class: Most other tags can't go inside it, with some exceptions.
     * *Usually contained by: Blocks, list items, columns, links, inlines.*
     * *Can usually contain: Inlines, links, images.*
     * 
     * **link**: A span of text that is a clickable link to somewhere. Links usually cannot be placed inside other links.
     * *Usually contained by: Blocks, list items, columns, inlines.*
     * *Can usually contain: Inlines, images.*
     * 
     * **list**: A block-like region that may only contain list items.
     * *Usually contained by: Blocks, list items, columns.*
     * *Can usually contain: List items.*
     * 
     * **listitem**: A single item in a list, this is a block-like region that can contain just about anything else.
     * *Usually contained by: Lists.*
     * *Can usually contain: Blocks, inlines, links, lists, columns, images, code*
     * 
     * **columns**: A block-like region that may contain multiple parallel columns of blocks within it.
     * *Usually contained by: Blocks, list items, columns.*
     * *Can usually contain: Blocks, inlines, links, lists, columns, images, code*
     * 
     * **nextcol**: An infinitely small class (with no content) designed to separate columns of a column group.
     * *Usually contained by: Columns.*
     * *Can usually contain: (nothing; has no body)*
     * 
     * **image**: An inline text-like object that is replaced with external content.
     * *Usually contained by: Blocks, inlines, links, list items, columns, code.*
     * *Can usually contain: (nothing; has no body)*
     * 
     * **code**: A block-like region that reproduces its contents exactly.
     * *Usually contained by: Blocks, list items, columns.*
     * *Can usually contain: (nothing; body is verbatim)*
     * @default 'block'
     */
    class?: ClassType
    /**
     * Array of class's, see {@link TagRules.class} for more detauls
     * @default ['block']
     */
    allow_in?: ClassType[],
    /**
     * Allow parameters for the tag, example is [size=5] or [url target="_blank"]
     * @default true
     */
    allow_params?: boolean,
    /**
     * Regex string to check value against, name in record should match name to be checked in {@link TagRules.template}
     */
    allow?: Record<string, string>,
    /**
     * Default value for template. Name in record should match name to be checked in {@link TagRules.template}
     */
    default?: Record<string, string>,
    /**
     * HTML Template for the tag, example: 
     * 
     * \<div style="border: {$size}px solid {$color}">{$_content}\</div>
     */
    template?: string,
    /**
     * Function name to callback to, function should look like:
     * 
     * function name(bbcode, action, name, defaultValue, params, content): {...}
     */
    method?: string,
    /**
     * Callback function to call when mode is BBMode.CALLBACK
     */
    callback?: (bbcode: BBCode, action: BBAction, name: string, defaultValue: string|null, params: Record<string,any>, content: string) =>  string | boolean
    /**
     * Allow or restrict content
     * @memberof BBType
     * @default BBType.OPTIONAL
     */
    content?: BBType
    /**
     * Allow or restrict ending tag
     * @memberof BBType
     * @default BBType.REQUIRED
     */
    end_tag?: BBType,
    /**
     * Controls how (non-newline) whitespace and newlines are treated when placed in proximity to this tag or to its end tag. For each setting, you use a simple pattern comprised of the following characters to describe what to remove:
     * - s: Remove any non-newline whitespace found.
     * - n: Remove a single newline, if one exists.
     * - a: Remove as many spaces and newlines as are found.
     * 
     * For 'before' removal, the pattern is matched backward from the tag; for 'after' removal, the pattern is matched forward from the tag. The default is the empty string, which means no whitespace or newlines are to be removed.
     * 
     * Common Examples:
     * - s: Remove all non-newline whitespace
     * - sn: Remove all non-newline whitespace, then a single newline if it exists.
     * - ns: Remove a single newline if it exists, then all non-newline whitespace.
     * - sns: Remove all non-newline whitespace, then a single newline if it exists, then any non-newline whitespace found past that newline.
     */
    before_tag?: string,
    /**
     * Controls how (non-newline) whitespace and newlines are treated when placed in proximity to this tag or to its end tag. For each setting, you use a simple pattern comprised of the following characters to describe what to remove:
     * - s: Remove any non-newline whitespace found.
     * - n: Remove a single newline, if one exists.
     * - a: Remove as many spaces and newlines as are found.
     * 
     * For 'before' removal, the pattern is matched backward from the tag; for 'after' removal, the pattern is matched forward from the tag. The default is the empty string, which means no whitespace or newlines are to be removed.
     * 
     * Common Examples:
     * - s: Remove all non-newline whitespace
     * - sn: Remove all non-newline whitespace, then a single newline if it exists.
     * - ns: Remove a single newline if it exists, then all non-newline whitespace.
     * - sns: Remove all non-newline whitespace, then a single newline if it exists, then any non-newline whitespace found past that newline.
     */
    after_tag?: string
    /**
     * Controls how (non-newline) whitespace and newlines are treated when placed in proximity to this tag or to its end tag. For each setting, you use a simple pattern comprised of the following characters to describe what to remove:
     * - s: Remove any non-newline whitespace found.
     * - n: Remove a single newline, if one exists.
     * - a: Remove as many spaces and newlines as are found.
     * 
     * For 'before' removal, the pattern is matched backward from the tag; for 'after' removal, the pattern is matched forward from the tag. The default is the empty string, which means no whitespace or newlines are to be removed.
     * 
     * Common Examples:
     * - s: Remove all non-newline whitespace
     * - sn: Remove all non-newline whitespace, then a single newline if it exists.
     * - ns: Remove a single newline if it exists, then all non-newline whitespace.
     * - sns: Remove all non-newline whitespace, then a single newline if it exists, then any non-newline whitespace found past that newline.
     */
    before_endtag?: string,
    /**
     * Controls how (non-newline) whitespace and newlines are treated when placed in proximity to this tag or to its end tag. For each setting, you use a simple pattern comprised of the following characters to describe what to remove:
     * - s: Remove any non-newline whitespace found.
     * - n: Remove a single newline, if one exists.
     * - a: Remove as many spaces and newlines as are found.
     * 
     * For 'before' removal, the pattern is matched backward from the tag; for 'after' removal, the pattern is matched forward from the tag. The default is the empty string, which means no whitespace or newlines are to be removed.
     * 
     * Common Examples:
     * - s: Remove all non-newline whitespace
     * - sn: Remove all non-newline whitespace, then a single newline if it exists.
     * - ns: Remove a single newline if it exists, then all non-newline whitespace.
     * - sns: Remove all non-newline whitespace, then a single newline if it exists, then any non-newline whitespace found past that newline.
     */
    after_endtag?: string
    /**
     * Array of content to be included from the parameters when in plain mode.
     */
    plain_content?: string[],
    /**
     * Array of content to be included from the parameters for a URL when operating in plain mode.
     * @override `_content` if present is handled special, the tag is stripped for just the content of the tag.
     */
    plain_link?: string[],
}

export interface Param {
    key: string,
    value: string
}

/**
 * Lexer State
 */
export interface State {
    /**
     * The current token being parsed
     * @memberof BBToken
     */
    token: BBToken,
    /**
     * Raw input text
     */
    text: string,
    /**
     * Current processing tag {@link TagType}, or boolean if none.
     */
    tag: TagType | boolean,
    /**
     * Next state of the lexer's state machine: {@link LexState.TEXT}, or {@link LexState.TAG}/nl/ws
     */
    state: LexState,
    /**
     * Tokenized input
     */
    input: string[],
    /**
     * Read pointer into the input array.
     */
    ptr: number,
    /**
     * Whether to "unget" the last token.
     */
    unget: boolean,
    /**
     * In verbatim mode, we return all input, unparsed, including comments.
     */
    verbatim: boolean
}

/**
 * The types of classes currently defined
 * 
 * **block**: A rectangular block of text, equivalent to the CSS display:block property. This is generally an outer containing class.
 * *Usually contained by: Blocks, list items, columns.*
 * *Can usually contain: Blocks, inlines, links, lists, columns, images, code*
 * 
 * **inline**: A span of text with an unusual property, like italics or boldface or a color change. This is generally an innermost class: Most other tags can't go inside it, with some exceptions.
 * *Usually contained by: Blocks, list items, columns, links, inlines.*
 * *Can usually contain: Inlines, links, images.*
 * 
 * **link**: A span of text that is a clickable link to somewhere. Links usually cannot be placed inside other links.
 * *Usually contained by: Blocks, list items, columns, inlines.*
 * *Can usually contain: Inlines, images.*
 * 
 * **list**: A block-like region that may only contain list items.
 * *Usually contained by: Blocks, list items, columns.*
 * *Can usually contain: List items.*
 * 
 * **listitem**: A single item in a list, this is a block-like region that can contain just about anything else.
 * *Usually contained by: Lists.*
 * *Can usually contain: Blocks, inlines, links, lists, columns, images, code*
 * 
 * **columns**: A block-like region that may contain multiple parallel columns of blocks within it.
 * *Usually contained by: Blocks, list items, columns.*
 * *Can usually contain: Blocks, inlines, links, lists, columns, images, code*
 * 
 * **nextcol**: An infinitely small class (with no content) designed to separate columns of a column group.
 * *Usually contained by: Columns.*
 * *Can usually contain: (nothing; has no body)*
 * 
 * **image**: An inline text-like object that is replaced with external content.
 * *Usually contained by: Blocks, inlines, links, list items, columns, code.*
 * *Can usually contain: (nothing; has no body)*
 * 
 * **code**: A block-like region that reproduces its contents exactly.
 * *Usually contained by: Blocks, list items, columns.*
 * *Can usually contain: (nothing; body is verbatim)*
 */
export type ClassType = 
"block" |
"inline" | 
"link" | 
"list" | 
"listitem" |
"columns" | 
"nextcol" |
"image" | 
"code"