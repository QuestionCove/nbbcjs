import BBCodeLibrary from "./bbcodelibrary";
import BBCodeLexer from "./bbcodelexer";
import Debugger from "./debugger";
import EmailAddressValidator from "./emailaddressvalidator";

import {version} from '../package.json';

//Modules
import preg_split, { PREG_SPLIT_DELIM_CAPTURE, PREG_SPLIT_NO_EMPTY } from "../modules/preg_split";
import filter_var from "../modules/filter_var";
import method_exists from "../modules/method_exists";
import { htmlEncode, htmlDecode } from '../modules/html_entities';
import strip_tags from '../modules/strip_tags';

//Types
import { BBStack, BBToken, BBMode, BBType, BBAction, DebugLevel } from '../@types/enums';
import { ClassType, Param, StackType, TagRules, TagType } from "../@types/dataTypes";

//PHP Methods
//TODO: Replace all PHP methods with native JavaScript
import basename from "locutus/php/filesystem/basename";
import parse_url from 'locutus/php/url/parse_url';
import str_replace from 'locutus/php/strings/str_replace';

export default class BBCode {
    /**
     * Current version number
     */
    static BBCODE_VERSION = version;
    /**
     * Current release date
     */
    static BBCODE_RELEASE = '2023-08-12';
    //-----------------------------------------------------------------------------
    // Instance variables.  Do not change any of these directly!  Use the
    // access methods provided below.
    protected tagRules: Record<string, TagRules>;  // List of tag rules currently in use.
    protected defaults: BBCodeLibrary;     // The standard library (an instance of class BBCodeLibrary).
    protected currentClass: ClassType;     // The current class (auto-computed).
    protected rootClass: ClassType;        // The root container class.
    protected lostStartTags: Record<string, number>;     // For repair when tags are badly mis-nested.
    protected startTags;         // An associative array of locations of start tags on the stack.
    protected allowAmpersand: boolean;     // If true, we use str_replace() instead of htmlEncode().
    protected tagMarker: string;           // Set to '[', '<', '{', or '('.
    protected ignoreNewlines;              // If true, newlines will be treated as normal whitespace.
    protected plainMode: boolean;          // Don't output tags:  Just output text/whitespace/newlines only.
    protected detectURLs: boolean;         // Should we audo-detect URLs and convert them to links?
    protected urlPattern: string;          // What to convert auto-detected URLs into.
    protected outputLimit: number;         // The maximum number of text characters to output.
    protected textLength: number;          // The number of text characters output so far.
    protected wasLimited: boolean;         // Set to true if the output was cut off.
    protected limitTail: string;           // What to add if the output is cut off.
    protected limitPrecision: number;      // How accurate should we be if we're cutting off text?
    protected emojiDir: string;            // The host filesystem path to emoji (should be an absolute path).
    protected emojiUrl: string;            // The URL path to emoji (possibly a relative path).
    protected emoji;                       // The current list of emoji.
    protected emojiRegex;                  // This is a regex, precomputed from the list of emoji above.
    protected emojiEnabled: boolean;       // Whether or not to perform emoji-parsing.
    protected wikiUrl: string;             // URL prefix used for [[wiki]] links.
    protected localImgDir: string;         // The host filesystem path to local images (should be an absolute path).
    protected localImgUrl: string;         // The URL path to local images (possibly a relative path).
    protected urlTargetable: boolean;      // If true, [url] tags can accept a target="+.+" parameter.
    protected urlTarget: boolean | string; // If non-false, [url] tags will use this target and no other.
    protected urlTemplate: string;         // The default template used with the default [url] tag.
    protected quoteTemplate: string;       // The default template used with the default [quote] tag.
    protected wikiUrlTemplate: string;     // The default template used when rendering wiki links.
    protected emailTemplate: string;       // The default template used with the default [email] tag.
    protected ruleHtml;                    // The default HTML to output for a [rule] tag.
    protected preTrim: string;             // How to trim the whitespace at the start of the input.
    protected postTrim: string;            // How to trim the whitespace at the end of the input.
    public debug: boolean;                 // Enable debugging mode
    protected maxEmoji: number;          // Maximum number of emoji that can be used in parse
    protected escapeContent: boolean;      // Encode HTML. POTENTIALLY DANGEROUS IF DISABLED. ONLY DISABLE IF YOU KNOW WHAT YOURE DOING.
    protected stack: StackType[];
    protected lexer: BBCodeLexer;
    /**
     * Initialize a new instance of the {@link BBCode} class.
     *
     * @param library The BBCode Library Class, It's possible to create your own via extending BBCodeLibrary
     */
    public constructor(library: BBCodeLibrary | null = null) {
        this.defaults = library ? library : new BBCodeLibrary();
        this.tagRules = this.defaults.defaultTagRules;
        this.emoji = this.defaults.defaultEmoji;
        this.emojiEnabled = true;
        this.emojiRegex = false;
        this.emojiDir = this.getDefaultEmojiDir();
        this.emojiUrl = this.getDefaultEmojiURL();
        this.wikiUrl = this.getDefaultWikiURL();
        this.localImgDir = this.getDefaultLocalImgDir();
        this.localImgUrl = this.getDefaultLocalImgURL();
        this.ruleHtml = this.getDefaultRuleHTML();
        this.preTrim = "";
        this.postTrim = "";
        this.rootClass = 'block';
        this.lostStartTags = {};
        this.startTags = 0;
        this.tagMarker = '[';
        this.allowAmpersand = false;
        this.currentClass = this.rootClass;
        this.debug = false;
        this.ignoreNewlines = false;
        this.outputLimit = 0;
        this.plainMode = false;
        this.wasLimited = false;
        this.limitTail = "...";
        this.limitPrecision = 0.15;
        this.detectURLs = false;
        this.urlPattern = '<a href="{$url/h}">{$text/h}</a>';
        this.urlTargetable = false;
        this.urlTarget = false;
        this.urlTemplate = '<a href="{$url/h}" class="bbcode_url"{$target/v}>{$content/v}</a>';
        this.quoteTemplate = "\n" + '<div class="bbcode_quote">' + "\n" + '<div class="bbcode_quote_head">{$title/v}</div>' + "\n";
        this.quoteTemplate += '<div class="bbcode_quote_body">{$content/v}</div>' + "\n</div>\n";
        this.wikiUrlTemplate = '<a href="{$wikiURL/v}{$name/v}" class="bbcode_wiki">{$title/h}</a>';
        this.emailTemplate = '<a href="mailto:{$email/h}" class="bbcode_email">{$content/v}</a>';
        this.maxEmoji = -1;
        this.escapeContent = true;
        this.stack = [];
    }
    //-----------------------------------------------------------------------------
    // State control.
    public setPreTrim(trim = "a") {
        this.preTrim = trim;
        return this;
    }
    public getPreTrim() {
        return this.preTrim;
    }
    public setPostTrim(trim = "a") {
        this.postTrim = trim;
        return this;
    }
    public getPostTrim() {
        return this.postTrim;
    }
    public setRoot(rootclass: ClassType = 'block') {
        this.rootClass = rootclass;
        return this;
    }
    public setRootInline() {
        this.rootClass = 'inline';
        return this;
    }
    public setRootBlock() {
        this.rootClass = 'block';
        return this;
    }
    public getRoot() {
        return this.rootClass;
    }
    public setDebug(enable = true) {
        this.debug = enable;
        return this;
    }
    public getDebug() {
        return this.debug;
    }
    /**
     * Set Log Level,
     * 0 is all
     * 1 is debug
     * 2 is info
     * 3 is warn (default)
     * 4 is error
     * 5 is none 
     * @param level DebugLevel
     */
    public setLogLevel(level: DebugLevel) {
        Debugger.level = level;
    }
    public getLogLevel() {
        return Debugger.level;
    }
    public setAllowAmpersand(enable = true) {
        this.allowAmpersand = enable;
        return this;
    }
    public getAllowAmpersand() {
        return this.allowAmpersand;
    }
    public setTagMarker(marker = '[') {
        this.tagMarker = marker;
        return this;
    }
    public getTagMarker() {
        return this.tagMarker;
    }
    public setIgnoreNewlines(ignore = true) {
        this.ignoreNewlines = ignore;
        return this;
    }
    public getIgnoreNewlines() {
        return this.ignoreNewlines;
    }
    public setLimit(limit = 0) {
        this.outputLimit = limit;
        return this;
    }
    public getLimit() {
        return this.outputLimit;
    }
    public setLimitTail(tail = "...") {
        this.limitTail = tail;
        return this;
    }
    public getLimitTail() {
        return this.limitTail;
    }
    public setLimitPrecision(prec = 0.15) {
        this.limitPrecision = prec;
        return this;
    }
    public getLimitPrecision() {
        return this.limitPrecision;
    }
    public setPlainMode(enable = true) {
        this.plainMode = enable;
        return this;
    }
    public getPlainMode() {
        return this.plainMode;
    }
    public setDetectURLs(enable = true) {
        this.detectURLs = enable;
        return this;
    }
    public getDetectURLs() {
        return this.detectURLs;
    }
    public setURLPattern(pattern) {
        this.urlPattern = pattern;
        return this;
    }
    public getURLPattern() {
        return this.urlPattern;
    }
    public setURLTargetable(enable: boolean) {
        this.urlTargetable = enable;
        return this;
    }
    public getURLTargetable() {
        return this.urlTargetable;
    }
    public setURLTarget(target) {
        this.urlTarget = target;
        return this;
    }
    public getURLTarget() {
        return this.urlTarget;
    }
    public setURLTemplate(template: string) {
        this.urlTemplate = template;
        return this;
    }
    public getURLTemplate() {
        return this.urlTemplate;
    }
    public setQuoteTemplate(template: string) {
        this.quoteTemplate = template;
        return this;
    }
    public getQuoteTemplate() {
        return this.quoteTemplate;
    }
    public setWikiURLTemplate(template: string) {
        this.wikiUrlTemplate = template;
        return this;
    }
    public getWikiURLTemplate() {
        return this.wikiUrlTemplate;
    }
    public setEmailTemplate(template: string) {
        this.emailTemplate = template;
        return this;
    }
    public getEmailTemplate() {
        return this.emailTemplate;
    }
    /**
     * Set the value for escape_content.
     *
     * @param escapeContent
     * @return this
     */
    public setEscapeContent(escapeContent: boolean) {
        this.escapeContent = escapeContent;
        return this;
    }
    /**
     * Get the current value of escapeContent.
     *
     * @return bool
     */
    public getEscapeContent() {
        return this.escapeContent;
    }
    //-----------------------------------------------------------------------------
    // Rule-management:  You can add your own custom tag rules, or use the defaults.
    // These are basically getter/setter functions that exist for convenience.
    public addRule(name: string, rule: TagRules) {
        this.tagRules[name] = rule;
        return this;
    }
    public removeRule(name: string) {
        delete this.tagRules[name];
        return this;
    }
    public getRule(name: string) {
        return this.tagRules[name] ? this.tagRules[name] : false;
    }
    public clearRules() {
        this.tagRules = {};
        return this;
    }
    public getDefaultRule(name: string) {
        return this.defaults.defaultTagRules[name] ? this.defaults.defaultTagRules[name] : false;
    }
    public setDefaultRule(name: string) {
        if (this.defaults.defaultTagRules[name]) {
            this.addRule(name, this.defaults.defaultTagRules[name]);
        } else {
            this.removeRule(name);
        }
    }
    public getDefaultRules() {
        return this.defaults.defaultTagRules;
    }
    public setDefaultRules() {
        this.tagRules = this.defaults.defaultTagRules;
        return this;
    }
    //-----------------------------------------------------------------------------
    // Handling for [[wiki]] and [[wiki|Wiki]] links and other replaced items.
    // These are basically getter/setter functions that exist for convenience.
    public setWikiURL(url: string) {
        this.wikiUrl = url;
        return this;
    }
    public getWikiURL() {
        return this.wikiUrl;
    }
    public getDefaultWikiURL() {
        return '/?page=';
    }
    public setLocalImgDir(path: string) {
        this.localImgDir = path;
        return this;
    }
    public getLocalImgDir() {
        return this.localImgDir;
    }
    public getDefaultLocalImgDir() {
        return "img";
    }
    public setLocalImgURL(path: string) {
        this.localImgUrl = path.replace(/\/+$/, '');
        return this;
    }
    public getLocalImgURL() {
        return this.localImgUrl;
    }
    public getDefaultLocalImgURL() {
        return "img";
    }
    public setRuleHTML(html) {
        this.ruleHtml = html;
        return this;
    }
    public getRuleHTML() {
        return this.ruleHtml;
    }
    public getDefaultRuleHTML() {
        return "\n<hr class=\"bbcode_rule\" />\n";
    }
    //-----------------------------------------------------------------------------
    // Emoji management.  You can use the default emoji, or add your own.
    // These are *mostly* getter/setter functions, but they also affect the
    // caching of the emoji-processing rules.
    public addEmoji(code: string, image: string) {
        this.emoji[code] = image;
        this.emojiRegex = false;
        return this;
    }
    public removeEmoji(code: string) {
        delete this.emoji[code];
        this.emojiRegex = false;
        return this;
    }
    public getEmoji(code: string) {
        return this.emoji[code] ? this.emoji[code] : false;
    }
    public clearEmoji() {
        this.emoji = {};
        this.emojiRegex = false;
        return this;
    }
    public getDefaultEmoji(code: string) {
        return this.defaults.defaultEmoji[code] ? this.defaults.defaultEmoji[code] : false;
    }
    public setDefaultEmoji(code: string) {
        if (this.defaults.defaultEmoji[code]) {
            this.emoji[code] = this.defaults.defaultEmoji[code];
        }
        this.emojiRegex = false;
        return this;
    }
    public getDefaultEmojis() {
        return this.defaults.defaultEmoji;
    }
    public setDefaultEmojis() {
        this.emoji = this.defaults.defaultEmoji;
        this.emojiRegex = false;
        return this;
    }
    public setEmojiDir(path) {
        this.emojiDir = path;
        return this;
    }
    public getEmojiDir() {
        return this.emojiDir;
    }
    public getDefaultEmojiDir() {
        return "emoji";
    }
    public setEmojiURL(path) {
        this.emojiUrl = path;
        return this;
    }
    public getEmojiURL() {
        return this.emojiUrl;
    }
    public getDefaultEmojiURL() {
        return "emoji";
    }
    public setEnableEmoji(enable = true) {
        this.emojiEnabled = enable;
        return this;
    }
    public getEnableEmoji(): boolean {
        return this.emojiEnabled;
    }
    public setMaxEmoji(count: number) {
        this.maxEmoji = count;
        if (this.maxEmoji < -1) {
            this.maxEmoji = -1;
        }
        return this;
    }
    public getMaxEmoji(): number {
        return this.maxEmoji;
    }
    //-----------------------------------------------------------------------------
    //  Emoji, URL, and HTML-conversion support routines.
    // Like PHP's built-in nl2br, but this one can convert Windows, Un*x, or Mac
    // newlines to a <br>, and regularizes the output to just use Un*x-style
    // newlines to boot.
    public nl2br(string: string): string {
        return string.replace(/\x0A|\x0D|\x0A\x0D|\x0D\x0A/g, "<br>\n");
    }
    // This function comes straight from the html-entities package
    public unHTMLEncode(string: string): string {
        return htmlDecode(string);
    }
    // This takes an arbitrary string and makes it a wiki-safe string:  It converts
    // all characters to be within [a-zA-Z0-9'",.:_-] by converting everything else to
    // _ characters, compacts multiple _ characters together, and trims initial and
    // trailing _ characters.  So, for example, [[Washington, D.C.]] would become
    // "Washington_D.C+", safe to pass through a URL or anywhere else.  All characters
    // in the extended-character range (0x7F-0xFF) will be URL-encoded.
    public wikify(string: string): string {
        return encodeURIComponent(str_replace(" ", "_", string.replace(/[!?;@#$%^&*<>=+`~\x00-\x20_-]+/g, " ").trim()));
    }
    /**
     * Returns true if the given string is a valid URL.
     *
     * If {@link emailToo} is false, this checks for:
     *
     * ```
     * http :// domain [:port] [/] [any single-line string]
     * https :// domain [:port] [/] [any single-line string]
     * ftp :// domain [:port] [/] [any single-line string]
     * ```
     *
     * If {@link emailToo} is true (the default), this also allows the mailto protocol:
     *
     * ```
     * mailto : name @ domain
     * ```
     *
     * @param string The URL to validate.
     * @param emailToo Whether or not a **mailto:** link is also valid.
     * @return Returns **true** if {@link string} is a valid URL or **false** otherwise.
     */
    public isValidURL(string: string, emailToo: boolean = true): boolean {
        // Validate using PHP's fast filter method.
        if (filter_var(string, 'FILTER_VALIDATE_URL') !== false &&
            ['http', 'https', 'ftp'].includes(parse_url(string, 'PHP_URL_SCHEME'))) {
            return true;
        }
        // Check for anything that does *not* have a colon in it before the first
        // slash or question mark or #; that indicates a local file relative to us.
        if (/^[^:]+([\\/\\\\?#][^\\r\\n]*)?$/.test(string)) {
            return true;
        }
        // Match mail addresses.
        if (emailToo && string.slice(0, 7) == "mailto:") {
            return this.isValidEmail(string.slice(7));
        }
        return false;
    }
    /**
     * Returns true if the given string is a valid e-mail address.
     *
     * This allows everything that RFC821 allows, including e-mail addresses that make no sense.
     * @param string The email address to validate.
     * @return Returns **true** if {@link string} is an email address or **false** otherwise.
     */
    public isValidEmail(string: string): boolean {
        const validator = new EmailAddressValidator();
        return validator.check_email_address(string);
    }
    /**
     * Escape HTML characters.
     *
     * This function is used to wrap around calls to htmlEncode() for
     * plain text so that you can add your own text-evaluation code if you want.
     * For example, you might want to make *foo* turn into <b>foo</b>, or
     * something like that.  The default behavior is just to call htmlEncode()
     * and be done with it, but if you inherit and override this function, you
     * can do pretty much anything you want.
     *
     * Note that htmlEncode() is still used directly for doing things like
     * cleaning up URLs in tags; this function is applied to *plain* *text* *only*.
     *
     * @param string The string to replace.
     * @return Returns an encoded version of {@link string}.
     */
    public htmlEncode(string: string): string {
        if (this.escapeContent) {
            if (!this.allowAmpersand) {
                return htmlEncode(string);
            } else {
                return str_replace(['<', '>', '"'], ['&lt;', '&gt;', '&quot;'], string);
            }
        } else {
            return string;
        }
    }
    /**
     * Properly encode tag content.
     *
     * Go through a string containing plain text and do three things on it:
     * Replace < and > and & and " with HTML-safe equivalents, and replace
     * emoji like :-) with <img /> tags, and replace any embedded URLs
     * with <a href=...>...</a> links.
     *
     * @param string The string to process.
     * @return Returns the processed version of {@link string}.
     */
    public fixupOutput(string: string): string {
        Debugger.debug("FixupOutput: input:", string);
        let output;
        if (!this.detectURLs) {
            // Easy case:  No URL-decoding, so don't take the time to do it.
            output = this.processEmoji(string);
        } else {
            // Extract out any embedded URLs, and then process emoji and such on
            // any text in between them.  This necessarily means that URLs get
            // slightly higher priority than emoji do, although there really
            // shouldn't be any overlap if the user's choices of emoji are at
            // least reasonably intelligent.  (For example, declaring "foo.com"
            // or ":http:" to be emoji will probably not work, since the URL decoder
            // will likely capture those before the emoji decoder ever has a chance
            // at them.  But then you didn't want a emoji named "foo.com" anyway,
            // did you?)
            const chunks = this.autoDetectURLs(string);
            output = [];
            if (chunks.length) {
                let isURL = false;
                for (const chunk of chunks) {
                    let usechunk = chunk;
                    if (!isURL) {
                        usechunk = this.processEmoji(chunk);
                    }
                    output.push(usechunk);
                    isURL = !isURL;
                }
            }
            output = output.join("");
        }
        if (this.debug)
            Debugger.debug("FixupOutput: output:", output);
        return output;
    }
    /**
     * Replace the emoji codes in a string with image tags.
     *
     * Go through a string containing plain text and do two things on it:
     * Replace < and > and & and " with HTML-safe equivalents, and replace
     * emoji like :-) with <img /> tags.
     *
     * @param string The string to process.
     * @return Returns the processed version of {@link string}.
     */
    protected processEmoji(string: string): string {
        let output;
        if (!this.emojiEnabled || this.plainMode) {
            // If emoji are turned off, don't convert them.
            output = this.htmlEncode(string);
        } else {
            // If the emoji need to be computed, process them now.
            if (!this.emojiRegex) {
                this.rebuildEmoji();
            }
            // Split the string so that it consists of alternating pairs of emoji and non-emoji.
            const tokens = preg_split(this.emojiRegex, string, -1, PREG_SPLIT_DELIM_CAPTURE);
            if (tokens.length <= 1) {
                // Special (common) case:  This skips the emoji constructor if there
                // were no emoji found, which is most of the time.
                output = this.htmlEncode(string);
            } else {
                output = "";
                let isEmoji = false;
                let emojiCount = 0;
                for (const token of tokens) {
                    if (!isEmoji) {
                        // For non-emoji text, we just pass it through htmlEncode.
                        output += this.htmlEncode(token);
                    } else {
                        const alt = htmlEncode(token);
                        if (emojiCount < this.maxEmoji || this.maxEmoji < 0) {
                            output += "<img src=\""+htmlEncode(this.emojiUrl+'/'+this.emoji[token])+'"'
                                +` alt="${alt}" title="${alt}" class="bbcode_emoji" />`;
                        } else {
                            output += token;
                        }
                        emojiCount++;
                    }
                    isEmoji = !isEmoji;
                }
            }
        }
        return output;
    }
    protected rebuildEmoji() {
        // Construct the this.emojiRegex that can recognize all
        // of the emoji.  This will save us a lot of computation time
        // in this.parse() if multiple BBCode strings are being
        // processed by the same script.
        const regex = ["/(?<![\\w])("];
        let first = true;
        for (const code in this.emoji) {
            const filename = this.emoji[code];
            if (!first)
                regex.push("|");
            regex.push(code.replace(/[.+*?[^\]$(){}=!<>|:\\/-]/g, '\\$&'));
            first = false;
        }
        regex.push(")(?![\\w])/");
        this.emojiRegex = regex.join("");
        if (this.debug)
            Debugger.debug("Internal_RebuildEmoji: regex:", this.emojiRegex);
    }
    /**
     * Search through the input for URLs, or things that are URL-like and replace with anchor tags.
     *
     * We search for several possibilities here:
     *
     *   First format (HTTP/HTTPS/FTP):
     *      <"http://" or "https://" or "ftp://"> <domain or IPv4> <optional tail>
     *
     *   Second format (implicit HTTP):
     *      <domain or IPv4> <optional tail>
     *
     *   Third format (e-mail):
     *      <simple username> "@" <domain>
     *
     * In short, we look for domains and protocols, and if we find them, we consume any paths
     * or parameters after them, stopping at the first whitespace.
     *
     * We use the same split-and-match technique used by the lexer and the emoji parser,
     * since it's the fastest way to perform tokenization in PHP.
     *
     * Once we find the URL, we convert it according to the rule given in this.urlPattern.
     *
     * Note that the input string is plain text, not HTML or BBCode.  The return value
     * must be an array of alternating pairs of plain text (even indexes) and HTML (odd indexes).
     *
     * @param string The string to detect the URLs in.
     * @return Returns an array in the form `[text, anchor, text, anchor, ...]`.
     */
    protected autoDetectURLs(string: string) {
        const hostRegex = /** @lang RegExp */
        "(?:" //host
            +"(?:[a-zA-Z0-9_-]+(?:\\.[a-zA-Z0-9_-]+)*\\.[a-z]{2,}(?::\\d+)?)" //domain name
            +"|(?:\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}(?::\\d+)?)" //ip address
        +")";

        const urlRegex = /** @lang RegExp */
        "(?:" //url
            +"(?:(?:https?|ftp):\\/\\/)?" //optional scheme
            +`${hostRegex}` //host
            +"(?:"
                +"(?=[\\/?#])" //the part after the domain must be one of these characters
                +"[@a-zA-Z0-9!#-'*-.:;\\/;?-z~=]*[a-zA-Z0-9#\\/=]"
            +")?" //path, query string etc
        +")";

        const emailRegex = /** @lang RegExp */
        "(?:" //email
            +"[a-zA-Z0-9._-]+"
            +"@[a-zA-Z0-9_-]+(?:\\.[a-zA-Z0-9_-]+)*\\.[a-z]{2,}" //domain name
        +")";
        
        const regex = /** @lang RegExp */
        "/"
        +"(?<=^|[\\s(])" //url starts at beginning, after space, within parentheses
        +"("
            +`${urlRegex}`
            +`|${emailRegex}`
        +")"
        +"(?=$|[\\s)]|[.!?;]($|[\\s]))" //url ends at the end, before space, within parentheses, before punctuation
        +"/Dx";

        const parts = preg_split(regex, string, -1, PREG_SPLIT_DELIM_CAPTURE);
        const result = [];
        let isURL = false;
        for (const part of parts) {
            let URLParts;
            if (!part || part.indexOf(' ') > -1) {
                URLParts = false;
            } else {
                URLParts = parse_url(part);
            }
            // Fix parts that are just single domains.
            if (URLParts !== false && new RegExp(`^${hostRegex}$`).test(part)) {
                URLParts['host'] = part;
                delete URLParts['path'];
            }
            // Look for an email address.
            if (new RegExp(`^${emailRegex}$`).test(part)) {
                URLParts = {
                    'url': `mailto:${part}`,
                    'host': part
                };
            }
            const validTLDIP = this.isValidTLD(URLParts['host'], true);
            // The TLD should be validated when there is no scheme.
            if (URLParts !== false && !URLParts['scheme'] && URLParts['host'] && !validTLDIP) {
                URLParts = false;
            }
            if (URLParts['scheme'] && !URLParts['host'] && validTLDIP) {
                URLParts['host'] = URLParts['scheme'];
            }
            if (URLParts === false || !URLParts['host']) {
                // Fix wrongly detected URL.
                if (isURL) {
                    result.push('');
                }
                result.push(part);
            } else {
                // Fix wrongly detected text.
                if (!isURL) {
                    result.push('');
                }
                if (!URLParts['url']) {
                    let URL = part;
                    if (!URLParts['scheme'] || URLParts['host'].startsWith(URLParts['scheme'])) {
                        URL = 'http://'+part;
                    }
                    URLParts['url'] = URL;
                }
                URLParts['link'] = URLParts['url'];
                URLParts['text'] = part;
                result.push(this.fillTemplate(this.urlPattern, URLParts));
            }
            isURL = !isURL;
        }
        return result;
    }
    /**
     * Check that a host name has a valid top level domain.
     *
     * @param host The host or TLD to check.
     * @param allowIPs Whether or not IPv4 strings should count as valid.
     * @return Returns **true** if {@link host} has a valid TLD or **false** otherwise.
     */
    public isValidTLD(host: string, allowIPs: boolean = false): boolean {
        const validTLDs = [
            'aero', 'arpa', 'biz', 'com', 'coop', 'dev', 'edu', 'example', 'gov', 'org', 'info', 'int', 'invalid',
            'local', 'mil', 'museum', 'name', 'net', 'onion', 'pro', 'swift', 'test'
        ];
        // An IP address should be considered okay.
        if (allowIPs && filter_var(host, 'FILTER_VALIDATE_IP') !== false) {
            return true;
        }
        // Only localhost is allowed if there is no TLD.
        if (host.indexOf('.') === -1) {
            return host === 'localhost';
        }
        // Strip the TLD portion from the string.
        const TLD: string = host.slice(host.lastIndexOf('.') + 1);
        // Check against the known TLDs.
        // We'll just assume that two letter TLDs are valid to avoid too many checks.
        if (validTLDs.includes(TLD) || /^[a-z]{2}$/.test(TLD)) {
            return true;
        }
        return false;
    }
    /**
     * Fill an HTML template using variable inserts, which look like this:
     *    {$variable}   or   {$variable/flags}   or even   {$myarray.george.father/flags}
     *
     * You may use any variable provided in the parameter array; and you may use the
     * special dot (.) operator to access members of array variables or of object
     * variables.
     *
     * You may add formatting flags to the variable to control how the text parameters
     * are cleaned up.  For example, {$variable/u} causes the variable to be urlencoded().
     * The available flags are:
     *
     *   v - Verbatim.  Do not apply any formatting to the variable; use its exact text,
     *       however the user provided it.  This overrides all other flags.
     *
     *   b - Apply basename().
     *   n - Apply nl2br().
     *   t - Trim.  This causes all initial and trailing whitespace to be trimmed (removed).
     *   w - Clean up whitespace.  This causes all non-newline whitespace, such as
     *       control codes and tabs, to be collapsed into individual space characters.
     *
     *   e - Apply HTMLEncode().
     *   h - Apply htmlEncode().
     *   k - Apply Wikify().
     *   u - Apply urlencode().
     *
     * Note that only one of the e, h, k, or u "formatting flags" may be specified;
     * these flags are mutually-exclusive.
     * 
     * @param template Template string
     * @param inserts Inserts Array
     * @param defaults Default Value Object
     */
    public fillTemplate(template: string, inserts: boolean | TagType, defaults: Record<string, string> = {}) {
        const pieces = template.split(/(\{\$[a-zA-Z0-9_.:/-]+\})/);
        // Special (common) high-speed case:  No inserts found in the template.
        if (pieces.length <= 1)
            return template;
        const result = [];
        let isInsert = false;
        for (const piece of pieces) {
            let matches, value;
            if (!isInsert) {
                if (this.debug)
                    Debugger.debug("FormatInserts: add text:", piece);
                result.push(piece);
            } else if (!(matches = piece.match(/\{\$([a-zA-Z0-9_:-]+)((?:\\.[a-zA-Z0-9_:-]+)*)(?:\/([a-zA-Z0-9_:-]+))?\}/))) {
                if (this.debug)
                    Debugger.debug("FormatInserts: not an insert: add as text:", piece);
                result.push(piece);
            } else {
                // We have a valid variable name, possibly with an index and some flags.
                // Locate the requested variable in the input parameters.
                if (inserts[matches[1]]) {
                    value = inserts[matches[1]];
                } else {
                    value = defaults[matches[1]] ? defaults[matches[1]] : null;
                }
                if (matches[2]) {
                    // We have one or more indexes, so break them apart and look up the requested data.
                    for (const index of matches[2].slice(1).split(".")) {
                        if (typeof value == "object") {
                            value = value[index] ? value[index] : null;
                        } else {
                            value = '';
                        }
                    }
                }
                // Make sure the resulting value is a printable string.
                switch (typeof value) {
                case 'boolean':
                    value = value ? "true" : "false";
                    break;
                case 'number':
                    value = value+'';
                    break;
                case 'bigint':
                    value = value+'';
                    break;
                case 'string':
                    break;
                default:
                    value = "";
                    break;
                }
                let flags: string[] = [];
                // See if there are any flags.
                if (matches[3]) {
                    flags = matches[3].split('');
                }
                // If there are flags, process the value according to them.
                if (!flags.includes('v')) {
                    if (flags.includes('w')) {
                        value = value.replace(/[\x00-\x09\x0B-\x0C\x0E-\x20]+/g, " ");
                    }
                    if (flags.includes('t')) {
                        value = value.trim();
                    }
                    if (flags.includes('b')) {
                        value = basename(value);
                    }
                    if (flags.includes('e')) {
                        value = this.htmlEncode(value);
                    } else if (flags.includes('k')) {
                        value = this.wikify(value);
                    } else if (flags.includes('h')) {
                        value = htmlEncode(value);
                    } else if (flags.includes('u')) {
                        value = encodeURIComponent(value);
                    }
                    if (flags.includes('n')) {
                        value = this.nl2br(value);
                    }
                }
                if (this.debug)
                    Debugger.debug("FormatInserts: add insert:", `"${piece}" -> "${value}"`);
                // Append the value to the output.
                result.push(value);
            }
            isInsert = !isInsert;
        }
        return result.join("");
    }
    ///  Stack and output-management (internal). ///
    /**
     * Collect a series of text strings from a token stack and return them as a single string.
     *
     * @param array The token stack.
     * @param start The starting index in {@link array} to process.
     * @return Returns the stack text from all the elements in the stack.
     */
    protected collectText(array: StackType[], start: number = 0): string {
        let output = "";
        for (let startnum = parseInt(start+''), end = array.length; start < end; start++) {
            output += array[start][BBStack.TEXT];
        }
        return output;
    }
    /**
     * Collect a series of text strings from a token stack in reverse and return them as a single string.
     *
     * @param array The token stack.
     * @param start The starting index in {@link array} to process.
     * @param end The ending index in {@link array} to process.
     * @return Returns the stack text from all the elements in the stack.
     */
    protected collectTextReverse(array: StackType[], start: number = 0, end: number = 0): string {
        let output = "";
        for (start = parseInt(start+''); start >= end; start--) {
            output += array[start][BBStack.TEXT];
        }
        return output;
    }
    /**
     * Output everything on the stack from pos to the top, inclusive, as plain text, and return it.
     *
     * This is a little more complicated than necessary, because if we encounter end-tag-optional tags in here, they're
     * not to be outputted as plain text:  They're fully legit, and need to be processed with the plain text after them
     * as their body. This returns a list of tokens in the REVERSE of output order.
     *
     * @param pos The position to start on the stack.
     * @return Returns an array of output tokens.
     */
    protected generateOutput(pos: number): StackType[] {
        if (this.debug) {
            Debugger.debug("Internal_GenerateOutput:", `from=${pos} len=${this.stack.length - pos}`);
            Debugger.debug("Internal_GenerateOutput: Stack contents:", this.dumpStack());
        }
        let output: StackType[] = [];
        while (this.stack.length > pos) {
            const token = this.stack.pop();
            if (token[BBStack.TOKEN] != BBToken.TAG) {
                // Not a tag, so just push it to the output.
                output.push(token);
                if (this.debug)
                    Debugger.debug("Internal_GenerateOutput: push text:", `"${token[BBStack.TEXT]}"`);
            } else {
                // This is a start tag that is either ending-optional or ending-forgotten.
                // But because of class dependencies, we can't simply reject it; deeper
                // tags may already have been processed on the assumption that this class
                // was valid.  So rather than reject it, as one might expect from
                // 'end_tag': BBCODE_REQUIRED, we process it so that any deeper tags
                // that require it will still be treated correctly.  This is the only
                // alternative to having to perform two passes over the input, one to validate
                // classes and the other to convert the output:  So we choose speed over
                // precision here, but it's a decision that only affects broken tags anyway.
                const name = token[BBStack.TAG]['_name'] ? token[BBStack.TAG]['_name'] : null;
                let rule = this.tagRules[name] ? this.tagRules[name] : null;
                let tagOutput;
                // Add default to the rule.
                rule = {...{
                    'end_tag': BBType.REQUIRED, 
                    'before_endtag': null, 
                    'after_tag': null, 
                    'before_tag': null
                }, ...rule};
                const endTag = rule['end_tag'];
                this.startTags[name].pop(); // Remove the locator for this tag.
                if (endTag == BBType.PROHIBIT) {
                    // Broken tag, so just push it to the output as HTML.
                    output.push({
                        [BBStack.TOKEN]: BBToken.TEXT,
                        [BBStack.TAG]: false,
                        [BBStack.TEXT]: token[BBStack.TEXT],
                        [BBStack.CLASS]: this.currentClass,
                    });
                    if (this.debug)
                        Debugger.debug("Internal_GenerateOutput: push broken tag:", token['text']);
                } else {
                    // Found a start tag where the end tag is optional, or a start
                    // tag where the end tag was forgotten, so that tag should be
                    // processed with the current output as its content.
                    if (this.debug)
                        Debugger.debug("Internal_GenerateOutput: found start tag with optional end tag:", token[BBStack.TEXT]);
                    // If this was supposed to have an end tag, and we find a floating one
                    // later on, then we should consume it.
                    if (endTag == BBType.REQUIRED) {
                        if (!this.lostStartTags[name]) {
                            this.lostStartTags[name] = 0;
                        }
                        this.lostStartTags[name]++;
                    }
                    const end = this.cleanupWSByIteratingPointer(rule['before_endtag'], 0, output);
                    this.cleanupWSByPoppingStack(rule['after_tag'], output);
                    const tagBody = this.collectTextReverse(output, output.length - 1, end);
                    // Note:  We don't process 'after_endtag' because the invisible end tag
                    // always butts up against another tag, so there's *never* any whitespace
                    // after it.  Attempting to process 'after_endtag' would just be a waste
                    // of time because it'd never match.  But 'before_tag' is useful, though.
                    this.cleanupWSByPoppingStack(rule['before_tag'], this.stack);
                    if (this.debug)
                        Debugger.debug("Internal_GenerateOutput: optional-tag's content: ", tagBody);
                    if (token[BBStack.TAG]) {
                        this.updateParamsForMissingEndTag(token[BBStack.TAG]);
                        tagOutput = this.doTag(
                            BBAction.OUTPUT,
                            name,
                            token[BBStack.TAG]['_default'] ? token[BBStack.TAG]['_default'] : null,
                            token[BBStack.TAG],
                            tagBody
                        );
                    } else {
                        tagOutput = this.doTag(
                            BBAction.OUTPUT,
                            name,
                            null,
                            null,
                            tagBody
                        );
                    }
                    if (this.debug) {
                        Debugger.debug("Internal_GenerateOutput: push optional-tag's output: ", tagOutput);
                    }
                    output = [{
                        [BBStack.TOKEN]: BBToken.TEXT,
                        [BBStack.TAG]: false,
                        [BBStack.TEXT]: tagOutput,
                        [BBStack.CLASS]: this.currentClass
                    }];
                }
            }
        }
        if (this.debug) {
            Debugger.debug("Internal_GenerateOutput: done; output contains "+output.length+" items:", this.dumpStack(output));
            const noutput = this.collectTextReverse(output, output.length - 1);
            Debugger.debug("Internal_GenerateOutput: output:", noutput);
            Debugger.debug("Internal_GenerateOutput: Stack contents:", this.dumpStack());
        }
        this.computeCurrentClass();
        return output;
    }
    // We're transitioning into a class that's not allowed inside the current one
    // (like they tried to put a [center] tag inside a [b] tag), so we need to
    // unwind the stack, outputting content until we're inside a valid state again.
    // To do this, we need to walk back down the stack, searching for a class that's
    // in the given list; when we find one, we output everything above it.  Then we
    // output everything on the stack from the given height to the top, inclusive,
    // and pop everything in that range.  This leaves a BBCODE_TEXT element on the
    // stack that is the fully-outputted version of the content, and its class
    // will be the same as that of the stack element before it (or root_class if there
    // is no element before it).
    //
    // This returns true if the stack could be rewound to a safe state, or false
    // if no such "safe state" existed.
    protected rewindToClass(classList: string[]): boolean {
        if (this.debug) {
            Debugger.debug(`Internal_RewindToClass:</b> stack has ${this.stack.length} items; allowed classes are:`, classList);
        }
        // Walk backward from the top of the stack, searching for a state where
        // the new class was still legal.
        let pos = this.stack.length - 1;
        while (pos >= 0 && !classList.includes(this.stack[pos][BBStack.CLASS]))
            pos--;
        if (pos < 0) {
            if (!classList.includes(this.rootClass))
                return false;
        }
        if (this.debug)
            Debugger.debug("Internal_RewindToClass:", `rewound to ${(pos + 1)}`);
        // Convert any tags on the stack from pos+1 to the top, inclusive, to
        // plain text tokens, possibly processing any tags where the end tags
        // are optional.
        const output = this.generateOutput(pos + 1);
        // Push the clean tokens back onto the stack.
        while (output.length) {
            const token = output.pop();
            token[BBStack.CLASS] = this.currentClass;
            this.stack.push(token);
        }
        if (this.debug) {
            Debugger.debug("Internal_RewindToClass:", `stack has ${this.stack.length} items now.`);
        }
        return true;
    }
    // We've found an end tag with the given name, so walk backward until we
    // find the start tag, and then output the contents.
    protected finishTag(tagName: string): string | false {
        if (this.debug) {
            Debugger.debug("Internal_FinishTag:", `stack has ${this.stack.length} items; searching for start tag for [${tagName}]`);
        }
        let pos, newpos, newend;
        // If this is a malformed tag like [/], tell them now, since there's
        // no way we can possibly match it.
        if (!tagName || tagName.length <= 0)
            return false;
        // This is where we *would* walk backward from the top of the stack, searching
        // for the matching start tag for this end tag.  But since we record the
        // locations of start tags in a separate array indexed by tag name, we don't
        // need to search:  We already know where the start tag is.  So we look up
        // the location of the start tag and rewind right to that spot.  This is really
        // only a constant-time speedup, since in the non-degenerate cases,
        // Internal_FinishTag() still runs in O(n) time.  (Internal_GenerateOutput()
        // runs in O(n) time, and Internal_FinishTag() calls it.  But in the degenerate
        // case, where there's an end tag with no start tag, this is significantly
        // faster, for whatever that's worth.)  But even a constant-time speedup is a
        // speedup, so this is overall a win.
        if (this.startTags[tagName] && this.startTags[tagName].length)
            pos = this.startTags[tagName].pop();
        else
            pos = -1;
        if (this.debug)
            Debugger.debug("Internal_FinishTag:", `rewound to ${pos + 1}`);
        // If there is no matching start tag, then this is a floating (bad)
        // end tag, so tell the caller.
        if (pos < 0)
            return false;
        // Okay, we're doing pretty good here.  We need to do whitespace
        // cleanup for after the start tag and before the end tag, though.  We
        // do end-tag cleanup by popping, and we do start-tag cleanup by skipping
        // pos forward.  (We add one because we've actually rewound the stack
        // to the start tag itself.)
        if (this.tagRules[tagName] && this.tagRules[tagName]['after_tag']) {
            newpos = this.cleanupWSByIteratingPointer(
                this.tagRules[tagName]['after_tag'] ? this.tagRules[tagName]['after_tag'] : null,
                pos + 1,
                this.stack
            );
        } else {
            newpos = this.cleanupWSByIteratingPointer(null, pos + 1, this.stack);
        }
        let delta = newpos - (pos + 1);
        if (this.debug) {
            Debugger.debug("Internal_FinishTag:", `whitespace cleanup (rule was "${this.tagRules[tagName]['after_tag']}") moved pointer to ${newpos}`);
        }
        // Output everything on the stack from pos to the top, inclusive, as
        // plain text, and then return it as a string, leaving the start tag on
        // the top of the stack.
        const output = this.generateOutput(newpos);
        // Clean off any whitespace before the end tag that doesn't belong there.
        if (this.tagRules[tagName] && this.tagRules[tagName]['before_endtag']) {
            newend = this.cleanupWSByIteratingPointer(this.tagRules[tagName]['before_endtag'], 0, output);
        } else {
            newend = this.cleanupWSByIteratingPointer(null, 0, output);
        }
        const fulloutput = this.collectTextReverse(output, output.length - 1, newend);
        if (this.debug)
            Debugger.debug("Internal_FinishTag:", `whitespace cleanup: popping ${delta} items`);
        // Clean up any 'afterTag' whitespace we skipped.
        while (delta-- > 0)
            this.stack.pop();
        this.computeCurrentClass();
        if (this.debug)
            Debugger.debug("Internal_FinishTag: output:", fulloutput);
        return fulloutput;
    }
    // Recompute the current class, based on the class of the stack's top element.
    protected computeCurrentClass() {
        if (this.stack.length > 0)
            this.currentClass = this.stack[this.stack.length - 1][BBStack.CLASS];
        else
            this.currentClass = this.rootClass;
        if (this.debug) {
            Debugger.debug("Internal_ComputeCurrentClass:", `current class is now "${this.currentClass}"`);
        }
    }
    // Given a stack of tokens in `array`, write it to a string (possibly with console
    // style encodings for readability, if `raw` is false).
    protected dumpStack(array?: StackType[]): string {
        let string = "";
        if (!array)
            array = this.stack;
        for (let item of array) {
            item = {...{
                [BBStack.TOKEN]: null, 
                [BBStack.TEXT]: null, 
                [BBStack.TAG]: {
                    '_name': ''
                }
            }, ...item};
            switch (item[BBStack.TOKEN]) {
            case BBToken.TEXT:
                string += JSON.stringify(item[BBStack.TEXT])+" ";
                break;
            case BBToken.WS:
                string += "WS ";
                break;
            case BBToken.NL:
                string += "NL ";
                break;
            case BBToken.TAG:
                string += JSON.stringify(`[${item[BBStack.TAG]['_name']}]`)+" ";
                break;
            default:
                string += "unknown ";
                break;
            }
        }
        return string;
    }
    //-----------------------------------------------------------------------------
    //  Whitespace cleanup routines (internal).
    // Walk down from the top of the stack, and remove whitespace/newline tokens from
    // the top according to the rules in the given pattern.
    protected cleanupWSByPoppingStack(pattern: string, array: StackType[]) {
        if (this.debug) {
            Debugger.debug("Internal_CleanupWSByPoppingStack:", `array has ${array.length} items; pattern="${pattern}"`);
        }
        if (!pattern)
            return;
        const oldlen = array.length;
        let token;
        for (const char of pattern.split('')) {
            switch (char) {
            case 's':
                while (array.length > 0 && array[array.length - 1][BBStack.TOKEN] == BBToken.WS)
                    array.pop();
                break;
            case 'n':
                if (array.length > 0 && array[array.length - 1][BBStack.TOKEN] == BBToken.NL)
                    array.pop();
                break;
            case 'a':
                while (array.length > 0 && ((token = array[array.length - 1][BBStack.TOKEN]) == BBToken.WS || token == BBToken.NL))
                    array.pop();
                break;
            }
        }
        if (this.debug) {
            Debugger.debug("Internal_CleanupWSByPoppingStack:", `array now has ${array.length} items`);
            Debugger.debug("Internal_CleanupWSByPoppingStack: array:", this.dumpStack(array));
        }
        if (array.length != oldlen) {
            // We only recompute the class if something actually changed.
            this.computeCurrentClass();
        }
    }
    // Read tokens from the input, and remove whitespace/newline tokens from the input
    // according to the rules in the given pattern.
    protected cleanupWSByEatingInput(pattern: string) {
        if (this.debug)
            Debugger.debug("Internal_CleanupWSByEatingInput:", `input pointer is at ${this.lexer.ptr}; pattern="${pattern}"`);
        if (!pattern)
            return;
        let tokenType;
        for (const char of pattern.split('')) {
            switch (char) {
            case 's':
                tokenType = this.lexer.nextToken();
                while (tokenType == BBToken.WS) {
                    tokenType = this.lexer.nextToken();
                }
                this.lexer.ungetToken();
                break;
            case 'n':
                tokenType = this.lexer.nextToken();
                if (tokenType != BBToken.NL)
                    this.lexer.ungetToken();
                break;
            case 'a':
                tokenType = this.lexer.nextToken();
                while (tokenType == BBToken.WS || tokenType == BBToken.NL) {
                    tokenType = this.lexer.nextToken();
                }
                this.lexer.ungetToken();
                break;
            }
        }
        if (this.debug)
            Debugger.debug("Internal_CleanupWSByEatingInput:", `input pointer is now at ${this.lexer.ptr}`);
    }
    // Read tokens from the given position in the stack, going forward as we match
    // the rules in the given pattern.  Returns the first position *after* the pattern.
    protected cleanupWSByIteratingPointer(pattern: string, pos: number, array: StackType[]) {
        if (this.debug) {
            Debugger.debug("Internal_CleanupWSByIteratingPointer:", `pointer is ${pos}; pattern="${pattern}"`);
        }
        if (!pattern)
            return pos;
        let token;
        for (const char of pattern.split('')) {
            switch (char) {
            case 's':
                while (pos < array.length && array[pos][BBStack.TOKEN] == BBToken.WS)
                    pos++;
                break;
            case 'n':
                if (pos < array.length && array[pos][BBStack.TOKEN] == BBToken.NL)
                    pos++;
                break;
            case 'a':
                while (pos < array.length && ((token = array[pos][BBStack.TOKEN]) == BBToken.WS || token == BBToken.NL))
                    pos++;
                break;
            }
        }
        if (this.debug) {
            Debugger.debug("Internal_CleanupWSByIteratingPointer:", `pointer is now ${pos}`);
            Debugger.debug("Internal_CleanupWSByIteratingPointer: array:", this.dumpStack(array));
        }
        return pos;
    }
    // We have a string that's too long, so chop it off at a suitable break so that it's
    // no longer than `limit` characters, if at all possible (if there's nowhere to break
    // before that, we just chop at `limit`).
    protected limitText(string: string, limit: number) {
        if (this.debug) {
            Debugger.debug("Internal_LimitText:", `chopping string of length ${string.length} at ${limit}.`);
        }
        const chunks = preg_split("/([\\x00-\\x20]+)/", string, -1, PREG_SPLIT_DELIM_CAPTURE);
        let output = "";
        for (const chunk of chunks) {
            if (output.length + chunk.length > limit)
                break;
            output += chunk;
        }
        output = output.trimEnd();
        if (this.debug)
            Debugger.debug("Internal_LimitText:", `resulting string is length ${output.length}`);
        return output;
    }
    // If we've reached the text limit, clean up the stack, push the limit tail,
    // set the we-hit-the-limit flag, and return.
    protected doLimit() {
        this.cleanupWSByPoppingStack("a", this.stack);
        if (this.limitTail.length > 0) {
            this.stack.push({
                [BBStack.TOKEN]: BBToken.TEXT,
                [BBStack.TEXT]: this.limitTail,
                [BBStack.TAG]: false,
                [BBStack.CLASS]: this.currentClass,
            });
        }
        this.wasLimited = true;
    }
    //-----------------------------------------------------------------------------
    //  Tag evaluation logic (internal).
    // Process a tag:
    //
    //   `action` is one of BBCODE_CHECK or BBCODE_OUTPUT.  During BBCODE_CHECK, `contents`
    //        will *always* be the empty string, and this function should return true if
    //        the tag is legal based on the available information; or it should return
    //        false if the tag is illegal.  During BBCODE_OUTPUT, `contents` will always
    //        be valid, and this function should return HTML.
    //
    //   `tagName` is the name of the tag being processed.
    //
    //   `defaultValue` is the default value given; for example, in [url=foo], it's "foo"+
    //        This value has NOT been passed through htmlEncode().
    //
    //   `params` is an array of key: value parameters associated with the tag; for example,
    //        in [emoji src=smile alt=:-)], it's `['src': "smile", 'alt': ":-)"]`.
    //        These keys and values have NOT beel passed through htmlEncode().
    //
    //   `contents` is the body of the tag during BBCODE_OUTPUT.  For example, in
    //        [b]Hello[/b], it's "Hello"+  THIS VALUE IS ALWAYS HTML, not BBCode.
    //
    // For BBCODE_CHECK, this must return true (if the tag definition is valid) or false
    // (if the tag definition is not valid); for BBCODE_OUTPUT, this function must return
    // HTML output.
    public doTag(action: BBAction, tagName: string, defaultValue: string, params: boolean | TagType, contents: string) {
        let tagRule = this.tagRules[tagName] ? this.tagRules[tagName] : null;
        let value, plainContent, possibleContent, start, end, link, result;
        switch (action) {
        case BBAction.CHECK:
            if (this.debug)
                Debugger.debug("DoTag:", `check tag [${tagName}]`);
            if (tagRule['allow']) {
                // An 'allow' array, if given, overrides the other check techniques.
                for (const param in tagRule['allow']) {
                    const pattern = tagRule['allow'][param];
                    if (param == '_content') {
                        value = contents;
                    } else if (param == '_defaultcontent') {
                        if (defaultValue.length) {
                            value = defaultValue;
                        } else {
                            value = contents;
                        }
                    } else {
                        if (params[param]) {
                            value = params[param];
                        } else {
                            if (tagRule['default']) {
                                value = tagRule['default'][param] ? tagRule['default'][param] : null;
                            } else {
                                value = null;
                            }
                        }
                    }
                    if (this.debug) {
                        Debugger.debug("<b>DoTag:", `check parameter "${param}", value "${value}", against "${pattern}"`);
                    }
                    //TODO: Fix below
                    if (!(typeof value == "string" && value.match(pattern.slice(1,-1)))) {
                        if (this.debug) 
                            Debugger.debug("DoTag:", `parameter "${param}" failed 'allow' check."`);
                        
                        return false;
                    }
                }
                return true;
            }
            result = true;
            if (tagRule['mode']) {
                tagRule = {...{'method': ''}, ...tagRule};
                switch (tagRule['mode']) {
                default:
                case BBMode.SIMPLE:
                    result = true;
                    break;
                case BBMode.ENHANCED:
                    result = true;
                    break;
                case BBMode.INTERNAL:
                    if (method_exists(this, tagRule['method'])) {
                        try {
                            result = this[tagRule['method']](BBAction.CHECK, tagName, defaultValue, params, contents);
                        } catch(error) {
                            Debugger.error(`Internal Function failed for tag: [${tagName}]:`, error);
                            result = false;
                        }
                    } else {
                        Debugger.warn(`Internal Function not found, skipping tag: [${tagName}]`, '');
                        result = false;
                    }
                    break;
                case BBMode.LIBRARY:
                    if (method_exists(this.defaults, tagRule['method'])) {
                        try {
                            result = this.defaults[tagRule['method']](this, BBAction.CHECK, tagName, defaultValue, params, contents);
                        } catch(error) {
                            Debugger.error(`Library Function failed for tag: [${tagName}]:`, error);
                            result = false;
                        }
                    } else {
                        Debugger.warn(`Library Function not found, skipping tag: [${tagName}]`, '');
                        result = false;
                    }
                    break;
                case BBMode.CALLBACK:
                    if (typeof tagRule['callback'] == "function" && typeof params == "object") {
                        try {
                            result = tagRule['callback'](this, BBAction.OUTPUT, tagName, defaultValue, params, contents);
                        } catch(error) {
                            Debugger.error(`Callback failed for tag: [${tagName}]:`, error);
                            result = false;
                        }
                    } else {
                        Debugger.warn(`Callback not found, skipping tag: [${tagName}]`, '');
                        result = false;
                    }
                    break;
                }
            }
            if (this.debug) {
                Debugger.debug("DoTag:", `tag [${tagName}] returned ${result ? "true" : "false"}`);
            }
            return result;
        case BBAction.OUTPUT:
            if (this.debug) {
                Debugger.debug("DoTag:", `output tag [${tagName}]: contents=${contents}`);
            }
            if (this.plainMode) {
                // In plain mode, we ignore the tag rules almost entirely, using just
                // the 'plain_start' and 'plain_end' before the content specified in
                // the 'plain_content' member.
                if (!tagRule['plain_content'])
                    plainContent = ['_content'];
                else
                    plainContent = tagRule['plain_content'];
                    // Find the requested content, in the order specified.
                result = possibleContent = "";
                for (const possibleContent of plainContent) {
                    if (possibleContent == '_content' && contents.length > 0) {
                        result = contents;
                        break;
                    }
                    if (params[possibleContent] && params[possibleContent].length > 0) {
                        result = htmlEncode(params[possibleContent]);
                        break;
                    }
                }
                if (this.debug) {
                    let contentList = "";
                    for (const possibleContent of plainContent)
                        contentList += htmlEncode(possibleContent)+",";
                    if (this.debug)
                        Debugger.debug("DoTag:", `plain-mode tag; possible contents were (${contentList}); using "${possibleContent}"`);
                }
                start = tagRule['plain_start'];
                end = tagRule['plain_end'];
                // If this is a link tag, figure out its target.
                if (tagRule['plain_link']) {
                    // Find the requested link target, in the order specified.
                    link = possibleContent = "";
                    for (const possibleContent of tagRule['plain_link']) {
                        if (possibleContent == '_content' && contents.length > 0) {
                            link = this.unHTMLEncode(strip_tags(contents));
                            break;
                        }
                        if (params[possibleContent] && params[possibleContent].length > 0) {
                            link = params[possibleContent];
                            break;
                        }
                    }
                    let URLParams = parse_url(link);
                    if (typeof URLParams !== "object") {
                        URLParams = {};
                    }
                    URLParams.link = link;
                    URLParams.url = link;
                    start = this.fillTemplate(start, URLParams);
                    end = this.fillTemplate(end, URLParams);
                }
                // Construct the plain output using the available content.
                return [start,result,end].join('');
            }
            tagRule = {...{'mode': BBMode.SIMPLE}, ...tagRule};
            switch (tagRule['mode']) {
            default:
            case BBMode.SIMPLE:
                result = [tagRule['simple_start'],contents,tagRule['simple_end']].join('');
                break;
            case BBMode.ENHANCED:
                result = this.doEnhancedTag(tagRule, params, contents);
                break;
            case BBMode.INTERNAL:
                try {
                    result = this[tagRule['method']](this, BBAction.OUTPUT, tagName, defaultValue, params, contents);
                } catch(error) {
                    Debugger.error(`Internal Output failed for tag: ${tagName}:`, error);
                    return false;
                }
                break;
            case BBMode.LIBRARY:
                try {
                    result = this.defaults[tagRule['method']](this, BBAction.OUTPUT, tagName, defaultValue, params, contents);
                } catch(error) {
                    Debugger.error(`Library Output failed for tag: ${tagName}:`, error);
                    return false;
                }
                break;
            case BBMode.CALLBACK:
                if (typeof tagRule['callback'] == "function" && typeof params == "object") {
                    try {
                        result = tagRule['callback'](this, BBAction.OUTPUT, tagName, defaultValue, params, contents);
                    } catch(error) {
                        Debugger.error(`Callback failed for tag: ${tagName}:`, error);
                        return false;
                    }
                } else {
                    Debugger.warn(`Callback not found, skipping tag: ${tagName}`);
                    return false;
                }
                break;
            }
            if (this.debug) {
                Debugger.debug("DoTag:", `output tag [${tagName}]: result=${result}`);
            }
            return result;
        default:
            if (this.debug)
                Debugger.debug("DoTag:", `unknown action ${action} requested.`);
            return false;
        }
    }
    // Format an enhanced tag, which is like a simple tag but uses a short HTML template
    // for its formatting instead.
    //
    // The variables you may use are the parameters of the tag, and '_default' for its
    // default value, '_name' for its name, and '_content' for its contents (body).
    // Note that in enhanced mode, the tag parameters' keys must match [a-zA-Z0-9_:-]+,
    // that is, alphanumeric, with underscore, colon, or hyphen.
    protected doEnhancedTag(tagRule: TagRules, params: boolean | TagType, contents: string): string {
        // Set up the special "_content" and "_defaultcontent" parameters.
        params['_content'] = contents;
        params['_defaultcontent'] = params['_default'] ? params['_default'] : contents;
        // Now use common template-formatting logic.
        if (tagRule['template']) {
            if (tagRule['default']) {
                return this.fillTemplate(tagRule['template'], params, tagRule['default']);
            } else {
                return this.fillTemplate(tagRule['template'], params, null);
            }
        } else {
            if (tagRule['default']) {
                return this.fillTemplate(null, params, tagRule['default']);
            } else {
                return this.fillTemplate(null, params, null);
            }
        }
    }
    //-----------------------------------------------------------------------------
    //  Parser token-processing routines (internal).
    // If an end-tag is required/optional but missing, we simulate it here so that the
    // rule handlers still see a valid '_endtag' parameter.  This way, all rules always
    // see valid '_endtag' parameters except for rules for isolated tags.
    protected updateParamsForMissingEndTag(params: boolean | TagType) {
        let tailMarker;
        switch (this.tagMarker) {
        case '[':
            tailMarker = ']';
            break;
        case '<':
            tailMarker = '>';
            break;
        case '{':
            tailMarker = '}';
            break;
        case '(':
            tailMarker = ')';
            break;
        default:
            tailMarker = this.tagMarker;
            break;
        }
        params['_endtag'] = this.tagMarker+'/'+params['_name']+tailMarker;
    }
    /**
     * Process an isolated tag, a tag that is not allowed to have an end tag.
     *
     * @param tagName The name of the tag.
     * @param tagParams All of the parameters passed to the tag.
     * @param tagRule The rule governing the tag.
     */
    protected processIsolatedTag(tagName: string, tagParams: boolean | TagType, tagRule: TagRules) {
        if (this.debug) {
            Debugger.debug("ProcessIsolatedTag:", `tag [${tagName}] is isolated: no end tag allowed, so processing immediately.`);
        }
        tagRule = {...{
            "_default": null,
            "before_tag": null,
            "after_tag": null
        }, ...tagRule};
        // Ask this tag if its attributes are valid; this gives the tag
        // the option to say, no, I'm broken, don't try to process me.
        if (!this.doTag(BBAction.CHECK, tagName, tagParams['_default'], tagParams, "")) {
            if (this.debug) {
                Debugger.debug("ProcessIsolatedTag:", `isolated tag [${tagName}] rejected its parameters; outputting as text after fixup.`);
            }
            this.stack.push({
                [BBStack.TOKEN]: BBToken.TEXT,
                [BBStack.TEXT]: this.fixupOutput(this.lexer.text),
                [BBStack.TAG]: false,
                [BBStack.CLASS]: this.currentClass,
            });
            return;
        }
        this.cleanupWSByPoppingStack(tagRule['before_tag'], this.stack);
        //TODO: Investigate what doTag outputs and type it
        const output = this.doTag(BBAction.OUTPUT, tagName, tagParams['_default'], tagParams, "");
        this.cleanupWSByEatingInput(tagRule['after_tag']);
        if (this.debug) {
            Debugger.debug("ProcessIsolatedTag:", `isolated tag [${tagName}] is done; pushing its output: ${output}`);
        }
        this.stack.push({
            [BBStack.TOKEN]: BBToken.TEXT,
            [BBStack.TEXT]: output,
            [BBStack.TAG]: false,
            [BBStack.CLASS]: this.currentClass,
        });
    }
    /**
     * Process a verbatim tag, a tag whose contents (body) must not be processed at all.
     *
     * @param tagName The name of the tag.
     * @param tagParams All of the parameters passed to the tag.
     * @param tagRule The rule governing the tag.
     */
    protected processVerbatimTag(tagName: string, tagParams: boolean | TagType, tagRule: TagRules) {
        // This tag is a special type that disallows all other formatting
        // tags within it and wants its contents reproduced verbatim until
        // its matching end tag.  We save the state of the lexer in case
        // we can't find an end tag, in which case we'll have to reject the
        // start tag as broken.
        const state = this.lexer.saveState();
        const endTag = this.lexer.tagMarker+"/"+tagName+this.lexer.endTagMarker;
        if (this.debug) {
            Debugger.debug("Internal_ProcessVerbatimTag:", `tag [${tagName}] uses verbatim content: searching for ${endTag}..."`);
        }
        // Push tokens until we find a matching end tag or end-of-input.
        const start = this.stack.length;
        this.lexer.verbatim = true;
        let tokenType: BBToken, newstart, endTagParams, text;
        while ((tokenType = this.lexer.nextToken()) != BBToken.EOI) {
            if (this.lexer.text.toLowerCase() == endTag.toLowerCase()) {
                // Found the end tag, so we're done.
                endTagParams = endTag;
                break;
            }
            if (this.debug) {
                Debugger.debug("Internal_ProcessVerbatimTag:", `push: ${this.lexer.text}`);
            }
            // If this token pushes us past the output limit, split it up on a whitespace
            // boundary, add as much as we can, and then abort.
            if (this.outputLimit > 0 && this.textLength + this.lexer.text.length >= this.outputLimit) {
                text = this.limitText(this.lexer.text, this.outputLimit - this.textLength);
                if (text.length > 0) {
                    this.textLength += text.length;
                    this.stack.push({
                        [BBStack.TOKEN]: BBToken.TEXT,
                        [BBStack.TEXT]: this.fixupOutput(text),
                        [BBStack.TAG]: false,
                        [BBStack.CLASS]: this.currentClass,
                    });
                }
                this.doLimit();
                break;
            }
            this.textLength += this.lexer.text.length;
            this.stack.push({
                [BBStack.TOKEN]: tokenType,
                [BBStack.TEXT]: htmlEncode(this.lexer.text),
                [BBStack.TAG]: this.lexer.tag,
                [BBStack.CLASS]: this.currentClass,
            });
        }
        this.lexer.verbatim = false;
        // We've collected a bunch of text for this tag.  Now, make sure it ended on
        // a valid end tag.
        if (tokenType == BBToken.EOI) {
            // No end tag, so we have to reject the start tag as broken, and
            // rewind the input back to where it was still sane.
            if (this.debug) {
                Debugger.debug("Internal_ProcessVerbatimTag:", `no end tag; reached EOI, so rewind and push start tag as text after fixup."`);
            }
            this.lexer.restoreState(state);
            // Rewind the stack too, since right now we've put all the stuff
            // since the code tag on, and it should be taken off.
            this.stack = this.stack.slice(0, start);
            this.stack.push({
                [BBStack.TOKEN]: BBToken.TEXT,
                [BBStack.TEXT]: this.fixupOutput(this.lexer.text),
                [BBStack.TAG]: false,
                [BBStack.CLASS]: this.currentClass,
            });
            return;
        }
        if (this.debug)
            Debugger.debug("Internal_ProcessVerbatimTag:", "found end tag.");
        // Clean up whitespace everywhere except before the start tag.
        if (tagRule['after_tag']) {
            newstart = this.cleanupWSByIteratingPointer(tagRule['after_tag'], start, this.stack);
        } else {
            newstart = this.cleanupWSByIteratingPointer(null, start, this.stack);
        }
        if (tagRule['before_endtag']) {
            this.cleanupWSByPoppingStack(tagRule['before_endtag'], this.stack);
        } else {
            this.cleanupWSByPoppingStack(null, this.stack);
        }
        if (tagRule['after_endtag']) {
            this.cleanupWSByEatingInput(tagRule['after_endtag']);
        } else {
            this.cleanupWSByEatingInput(null);
        }
        // Collect the output from `newstart` to the top of the stack, and then
        // quickly pop off all of those tokens.
        const content = this.collectText(this.stack, newstart);
        if (this.debug) {
            Debugger.debug("Internal_ProcessVerbatimTag:", `removing stack elements starting at ${start} (stack has ${this.stack.length} elements).`);
        }
        this.stack.splice(start);
        this.computeCurrentClass();
        // Clean up whitespace before the start tag (the tag was never pushed
        // onto the stack itself, so we don't need to remove it).
        if (tagRule['before_tag']) {
            this.cleanupWSByPoppingStack(tagRule['before_tag'], this.stack);
        } else {
            this.cleanupWSByPoppingStack(null, this.stack);
        }
        // Found the end tag, so process this tag immediately with
        // the contents collected between them.  Note that we do NOT
        // pass the contents through htmlEncode or FixupOutput
        // or anything else that could sanitize it:  They asked for
        // verbatim contents, so they're going to get it.
        tagParams['_endtag'] = endTagParams;
        tagParams['_hasend'] = true;
        if (!tagParams['_default']) {
            tagParams['_default'] = null;
        }
        const output = this.doTag(BBAction.OUTPUT, tagName, tagParams['_default'], tagParams, content);
        if (this.debug) {
            Debugger.debug("Internal_ProcessVerbatimTag:", `end of verbatim [${tagName}] tag processing; push output as text: ${output}`);
        }
        this.stack.push({
            [BBStack.TOKEN]: BBToken.TEXT,
            [BBStack.TEXT]: output,
            [BBStack.TAG]: false,
            [BBStack.CLASS]: this.currentClass,
        });
    }
    /**
     * Called when the parser has read a Token.BBCODE_TAG token.
     */
    protected parseStartTagToken() {
        // Tags are somewhat complicated, because they have to do several things
        // all at once.  First, let's look up what we know about the tag we've
        // encountered.
        const tagParams = this.lexer.tag;
        const tagName = tagParams['_name'] ? tagParams['_name'] : null;
        if (this.debug) {
            Debugger.debug("Internal_ParseStartTagToken:", `got tag [${tagName}]`);
        }
        let newclass;
        // Make sure this tag has been defined.
        if (!this.tagRules[tagName]) {
            if (this.debug) {
                Debugger.debug("Internal_ParseStartTagToken:", `tag [${tagName}] does not exist; pushing as text after fixup."`);
            }
            // If there is no such tag with this name, then just push the text as
            // though it was plain text.
            this.stack.push({
                [BBStack.TOKEN]: BBToken.TEXT,
                [BBStack.TEXT]: this.fixupOutput(this.lexer.text),
                [BBStack.TAG]: false,
                [BBStack.CLASS]: this.currentClass,
            });
            return;
        }
        // Check for tags that do not allow params
        if (this.tagRules[tagName]['allow_params']) {
            if (this.tagRules[tagName]['allow_params'] === false) {
                if (tagParams['_params'].length > 1) {
                    // If there is no such tag with this name, then just push the text as
                    // though it was plain text.
                    this.stack.push({
                        [BBStack.TOKEN]: BBToken.TEXT,
                        [BBStack.TEXT]: this.fixupOutput(this.lexer.text),
                        [BBStack.TAG]: false,
                        [BBStack.CLASS]: this.currentClass,
                    });
                    return;
                }
            }
        }
        const tagRule = this.tagRules[tagName];
        // We've got a known tag. See if it's valid inside this class; for example,
        // it's legal to put an inline tag inside a block tag, but not legal to put a
        // block tag inside an inline tag.
        const allowIn = Array.isArray(tagRule['allow_in']) ? tagRule['allow_in'] : [this.rootClass];
        if (!allowIn.includes(this.currentClass)) {
            // Not allowed.  Rewind the stack backward until it is allowed.
            if (this.debug) {
                Debugger.debug("Internal_ParseStartTagToken:", `tag [${tagName}] is disallowed inside class ${this.currentClass}; rewinding stack to a safe class.`);
            }
            if (!this.rewindToClass(allowIn)) {
                if (this.debug) {
                    Debugger.debug("Internal_ParseStartTagToken:", "no safe class exists; rejecting this tag as text after fixup.");
                }
                this.stack.push({
                    [BBStack.TOKEN]: BBToken.TEXT,
                    [BBStack.TEXT]: this.fixupOutput(this.lexer.text),
                    [BBStack.TAG]: false,
                    [BBStack.CLASS]: this.currentClass,
                });
                return;
            }
        }
        // Okay, this tag is allowed (in theory).  Now we need to see whether it's
        // a tag that requires an end tag, or whether it's end-tag-optional, or whether
        // it's end-tag-prohibited.  If it's end-tag-prohibited, then we process it
        // right now (no content); otherwise, we push it onto the stack to defer
        // processing it until either its end tag is encountered or we reach EOI.
        const endTag = tagRule['end_tag'] ? tagRule['end_tag'] : BBType.REQUIRED;
        if (endTag == BBType.PROHIBIT) {
            // No end tag, so process this tag RIGHT NOW.
            this.processIsolatedTag(tagName, tagParams, tagRule);
            return;
        }
        // This tag has a BBCODE_REQUIRED or BBCODE_OPTIONAL end tag, so we have to
        // push this tag on the stack and defer its processing until we see its end tag.
        if (this.debug) {
            Debugger.debug("Internal_ParseStartTagToken:", `tag [${tagName}] is allowed to have an end tag."`);
        }
        // Ask this tag if its attributes are valid; this gives the tag the option
        // to say, no, I'm broken, don't try to process me.
        if (!this.doTag(BBAction.CHECK, tagName, tagParams['_default'] ? tagParams['_default'] : null, tagParams, "")) {
            if (this.debug) {
                Debugger.debug("Internal_ParseStartTagToken:", `tag [${tagName}] rejected its parameters; outputting as text after fixup.`);
            }
            this.stack.push({
                [BBStack.TOKEN]: BBToken.TEXT,
                [BBStack.TEXT]: this.fixupOutput(this.lexer.text),
                [BBStack.TAG]: false,
                [BBStack.CLASS]: this.currentClass,
            });
            return;
        }
        if (tagRule['content'] && tagRule['content'] == BBType.VERBATIM) {
            // Verbatim tags have to be handled specially, since they consume successive
            // input immediately.
            this.processVerbatimTag(tagName, tagParams, tagRule);
            return;
        }
        // This is a normal tag that has (or may have) an end tag, so just
        // push it onto the stack and wait for the end tag or the output
        // generator to clean it up.  The act of pushing this causes us to
        // switch to its class.
        if (tagRule['class'])
            newclass = tagRule['class'];
        else
            newclass = this.rootClass;
        if (this.debug) {
            Debugger.debug("Internal_ParseStartTagToken:", `pushing tag [${tagName}] onto stack; switching to class ${newclass}.`);
        }
        this.stack.push({
            [BBStack.TOKEN]: this.lexer.token,
            [BBStack.TEXT]: this.fixupOutput(this.lexer.text),
            [BBStack.TAG]: this.lexer.tag,
            [BBStack.CLASS]: (this.currentClass = newclass),
        });
        if (!this.startTags[tagName])
            this.startTags[tagName] = [this.stack.length - 1];
        else
            this.startTags[tagName].push(this.stack.length - 1);
    }
    /**
     * Called when the parser has read a this.BBCODE_ENDTAG token.
     */
    protected parseEndTagToken() {
        const tagParams = this.lexer.tag;
        const tagName = tagParams['_name'] ? tagParams['_name'] : null;
        if (this.debug) {
            Debugger.debug("Internal_ParseEndTagToken:",`got end tag [/${tagName}].`);
        }
        // Got an end tag.  Walk down the stack and see if there's a matching
        // start tag for it anywhere.  If we find one, we pack everything between
        // them as output HTML, and then have the tag format itself with that
        // content.
        const contents = this.finishTag(tagName);
        if (contents === false) {
            // There's no start tag for this --- unless there was and it was in a bad
            // place.  If there's a start tag we can't reach, then swallow this end tag;
            // otherwise, just output this end tag itself as plain text.
            if (this.debug) {
                Debugger.debug("Internal_ParseEndTagToken:", `no start tag for [/${tagName}]; push as text after fixup.`);
            }
            if (this.lostStartTags[tagName] && this.lostStartTags[tagName] > 0) {
                this.lostStartTags[tagName]--;
            } else {
                this.stack.push({
                    [BBStack.TOKEN]: BBToken.TEXT,
                    [BBStack.TEXT]: this.fixupOutput(this.lexer.text),
                    [BBStack.TAG]: false,
                    [BBStack.CLASS]: this.currentClass,
                });
            }
            return;
        }
        // Found a start tag for this, so pop it off the stack, then process the
        // tag, and push the result back onto the stack as plain HTML.
        // We don't need to run a BBCODE_CHECK on the start tag, because it was already
        // done when the tag was pushed onto the stack.
        const startTagNode = this.stack.pop();
        const startTagParams = startTagNode[BBStack.TAG];
        this.computeCurrentClass();
        if (this.tagRules[tagName] && this.tagRules[tagName]['before_tag']) {
            this.cleanupWSByPoppingStack(this.tagRules[tagName]['before_tag'], this.stack);
        } else {
            this.cleanupWSByPoppingStack(null, this.stack);
        }
        startTagParams['_endtag'] = tagParams['_tag'];
        startTagParams['_hasend'] = true;
        const output = this.doTag(
            BBAction.OUTPUT,
            tagName,
            startTagParams['_default'] ? startTagParams['_default'] : null,
            startTagParams,
            contents
        );
        if (this.tagRules[tagName]['after_endtag']) {
            this.cleanupWSByEatingInput(this.tagRules[tagName]['after_endtag']);
        } else {
            this.cleanupWSByEatingInput(null);
        }
        if (this.debug) {
            Debugger.debug("Internal_ParseEndTagToken:", `end tag [/${tagName}] done; push output: ${output}`);
        }
        this.stack.push({
            [BBStack.TOKEN]: BBToken.TEXT,
            [BBStack.TEXT]: output,
            [BBStack.TAG]: false,
            [BBStack.CLASS]: this.currentClass,
        });
    }
    /**
     * Parse a BBCode string and convert it into HTML.
     *
     * Core parser.  This is where all the magic begins and ends.
     * Core parsing routine.  Call with a BBCode string, and it returns an HTML string.
     *
     * @param string The BBCode string to parse.
     * @return Returns the HTML version of {@link string}.
     */
    public parse(string: string): string {
        if (!string) return undefined;
        if (this.debug) {
            Debugger.debug("Parse Begin:", `input string is ${string.length} characters long:"`);
            Debugger.debug("Parse:", `input: ${string}`);
        }
        // The lexer is responsible for converting individual characters to tokens,
        // and uses preg_split to do most of its magic.  Because it uses preg_split
        // and not a character-by-character tokenizer, the structure of the input
        // must be known in advance, which is why the tag marker cannot be changed
        // during the parse.
        this.lexer = new BBCodeLexer(string, this.tagMarker);
        this.lexer.debug = this.debug;
        // If we're fuzzily limiting the text length, see if we need to actually
        // cut it off, or if it's close enough to not be worth the effort.
        const oldOutputLimit = this.outputLimit;
        let result;
        if (this.outputLimit > 0) {
            if (this.debug)
                Debugger.debug("Parse:", `Limiting text length to ${this.outputLimit}.`);
            if (string.length < this.outputLimit) {
                // Easy case:  A short string can't possibly be longer than the output
                // limit, so just turn off the output limit.
                this.outputLimit = 0;
                if (this.debug)
                    Debugger.debug("Parse:", "Not bothering to limit: Text is too short already.");
            } else if (this.limitPrecision > 0) {
                // We're using fuzzy precision, so make a guess as to how long the text is,
                // and then decide whether we can let this string slide through based on the
                // limit precision.
                const guessLength = this.lexer.guessTextLength();
                if (this.debug)
                    Debugger.debug("Parse:", `Maybe not: Fuzzy limiting enabled, and approximate text length is ${guessLength}.`);
                if (guessLength < this.outputLimit * (this.limitPrecision + 1.0)) {
                    if (this.debug)
                        Debugger.debug("Parse:", "Not limiting text; it's close enough to the limit to be acceptable.");
                    this.outputLimit = 0;
                } else {
                    if (this.debug)
                        Debugger.debug("Parse:", "Limiting text; it's definitely too long.");
                }
            }
        }
        // The token stack is used to perform a document-tree walk without actually
        // building the document tree, and is an essential component of our input-
        // validation algorithm.
        this.stack = [];
        // There are no start tags (yet).
        this.startTags = {};
        // There are no unmatched start tags (yet).
        this.lostStartTags = {};
        // There is no text yet.
        this.textLength = 0;
        this.wasLimited = false;
        // Remove any initial whitespace in pre-trim mode.
        if (this.preTrim.length > 0)
            this.cleanupWSByEatingInput(this.preTrim);
        // In plain mode, we generate newlines instead of <br> tags.
        const newline = this.plainMode ? "\n" : "<br>\n";
        // This is a fairly straightforward push-down automaton operating in LL(1) mode.  For
        // clarity's sake, we break the tag-processing code into separate functions, but we
        // keep the text/whitespace/newline code here for performance reasons.
        while (true) {
            let tokenType: BBToken;
            if ((tokenType = this.lexer.nextToken()) == BBToken.EOI) {
                break;
            }
            if (this.debug)
                Debugger.debug("Parse: Stack contents:", this.dumpStack());
            switch (tokenType) {
            case BBToken.TEXT:
                // Text is like an arithmetic operand, so just push it onto the stack because we
                // won't know what to do with it until we reach an operator (e.g., a tag or EOI).
                if (this.debug) {
                    Debugger.debug("Internal_ParseTextToken:", `fixup and push text: "${this.lexer.text}"`);
                }
                // If this token pushes us past the output limit, split it up on a whitespace
                // boundary, add as much as we can, and then abort.
                if (this.outputLimit > 0 && this.textLength + this.lexer.text.length >= this.outputLimit) {
                    const text = this.limitText(this.lexer.text, this.outputLimit - this.textLength);
                    if (text.length > 0) {
                        this.textLength += text.length;
                        this.stack.push({
                            [BBStack.TOKEN]: BBToken.TEXT,
                            [BBStack.TEXT]: this.fixupOutput(text),
                            [BBStack.TAG]: false,
                            [BBStack.CLASS]: this.currentClass,
                        });
                    }
                    this.doLimit();
                    break;
                }
                this.textLength += this.lexer.text.length;
                // Push this text token onto the stack.
                this.stack.push({
                    [BBStack.TOKEN]: BBToken.TEXT,
                    [BBStack.TEXT]: this.fixupOutput(this.lexer.text),
                    [BBStack.TAG]: false,
                    [BBStack.CLASS]: this.currentClass,
                });
                break;
            case BBToken.WS:
                // Whitespace is like an operand too, so just push it onto the stack, but
                // sanitize it by removing all non-tab non-space characters.
                if (this.debug)
                    Debugger.debug("Internal_ParseWhitespaceToken:", "fixup and push whitespace");
                    // If this token pushes us past the output limit, don't process anything further.
                if (this.outputLimit > 0 && this.textLength + this.lexer.text.length >= this.outputLimit) {
                    this.doLimit();
                    break;
                }
                this.textLength += this.lexer.text.length;
                // Push this whitespace onto the stack.
                this.stack.push({
                    [BBStack.TOKEN]: BBToken.WS,
                    [BBStack.TEXT]: this.lexer.text,
                    [BBStack.TAG]: false,
                    [BBStack.CLASS]: this.currentClass,
                });
                break;
            case BBToken.NL:
                // Newlines are really like tags in disguise:  They insert a replaced
                // element into the output, and are actually more-or-less like plain text.
                if (this.debug)
                    Debugger.debug("Internal_ParseNewlineToken:", "got a newline.");
                if (this.ignoreNewlines) {
                    if (this.debug)
                        Debugger.debug("Internal_ParseNewlineToken:", "push newline as whitespace.");
                        // If this token pushes us past the output limit, don't process anything further.
                    if (this.outputLimit > 0 && this.textLength + 1 >= this.outputLimit) {
                        this.doLimit();
                        break;
                    }
                    this.textLength += 1;
                    // In `ignoreNewlines` mode, we simply push the newline as whitespace.
                    // Note that this can yield output that's slightly different than the
                    // input:  For example, a "\r\n" input will produce a "\n" output; but
                    // this should still be acceptable, since we're working with text, not
                    // binary data.
                    this.stack.push({
                        [BBStack.TOKEN]: BBToken.WS,
                        [BBStack.TEXT]: "\n",
                        [BBStack.TAG]: false,
                        [BBStack.CLASS]: this.currentClass,
                    });
                } else {
                    // Any whitespace before a newline isn't worth outputting, so if there's
                    // whitespace sitting on top of the stack, remove it so that it doesn't
                    // get outputted.
                    this.cleanupWSByPoppingStack("s", this.stack);
                    if (this.debug)
                        Debugger.debug("Internal_ParseNewlineToken:", "push newline.");
                        // If this token pushes us past the output limit, don't process anything further.
                    if (this.outputLimit > 0 && this.textLength + 1 >= this.outputLimit) {
                        this.doLimit();
                        break;
                    }
                    this.textLength += 1;
                    // Add the newline to the stack.
                    this.stack.push({
                        [BBStack.TOKEN]: BBToken.NL,
                        [BBStack.TEXT]: newline,
                        [BBStack.TAG]: false,
                        [BBStack.CLASS]: this.currentClass,
                    });
                    // Any whitespace after a newline is meaningless, so if there's whitespace
                    // lingering on the input after this, remove it now.
                    this.cleanupWSByEatingInput("s");
                }
                break;
            case BBToken.TAG:
                // Use a separate function to handle tags, because they're complicated.
                this.parseStartTagToken();
                break;
            case BBToken.ENDTAG:
                // Use a separate function to handle end tags, because they're complicated.
                this.parseEndTagToken();
                break;
            default:
                break;
            }
        }
        if (this.debug)
            Debugger.debug("Parse Done:", "done main parse; packing stack as text string.");
        // Remove any trailing whitespace in post-trim mode.
        if (this.postTrim.length > 0)
            this.cleanupWSByPoppingStack(this.postTrim, this.stack);
        // Everything left on the stack should be HTML (or broken tags), so pop it
        // all off as plain text, concatenate it, and return it.
        result = this.generateOutput(0);
        result = this.collectTextReverse(result, result.length - 1);
        // If we changed the limit (in fuzzy-limit mode), set it back.
        this.outputLimit = oldOutputLimit;
        // In plain mode, we do just a *little* more cleanup on the whitespace to shorten
        // the output as much as possible.
        if (this.plainMode) {
            // Turn all non-newline whitespace characters into single spaces.
            result = result.replace(/[\x00-\x09\x0B-\x20]+/g, " ");
            // Turn multiple newlines into at most two newlines.
            result = result.replace(/(?:[\x20]*\n){2,}[\x20]*/g, "\n\n");
            // Strip off all surrounding whitespace.
            result = result.trim();
        }
        if (this.debug) {
            Debugger.debug("Parse: return:", `${result}\n\n`);
        }
        return result;
    }
}