import BBCodeLibrary from "./bbcodelibrary";
import BBCodeLexer from "./bbcodelexer";
import Debugger from "./debugger";
import EmailAddressValidator from "./emailaddressvalidator";

import {version} from '../package.json';

//Modules
import preg_split, { PREG_SPLIT_DELIM_CAPTURE, PREG_SPLIT_NO_EMPTY } from "../modules/preg_split";
import filter_var from "../modules/filter_var";
import method_exists from "../modules/method_exists";

//Types
import { BBStack, BBToken, BBMode, BBType, BBAction, DebugLevel } from '../@types/enums';
import { ClassType, Param, StackType, TagRules, TagType } from "../@types/dataTypes";

//PHP Methods
//TODO: Replace all PHP methods with native JavaScript
import array_flip from 'locutus/php/array/array_flip';
import basename from "locutus/php/filesystem/basename";
import empty from "locutus/php/var/empty";
import html_entity_decode from 'locutus/php/strings/html_entity_decode';
import htmlspecialchars from 'locutus/php/strings/htmlspecialchars';
import in_array from 'locutus/php/array/in_array';
import parse_url from 'locutus/php/url/parse_url';
import preg_match from 'locutus/php/pcre/preg_match';
import preg_quote from "locutus/php/pcre/preg_quote";
import preg_replace from 'locutus/php/pcre/preg_replace';
import rawurlencode from 'locutus/php/url/rawurlencode';
import rtrim from 'locutus/php/strings/rtrim';
import str_replace from 'locutus/php/strings/str_replace';
import strip_tags from "locutus/php/strings/strip_tags";
import strpos from "locutus/php/strings/strpos";
import strrchr from "locutus/php/strings/strrchr";
import substr from 'locutus/php/strings/substr';
import trim from 'locutus/php/strings/trim';
import urlencode from 'locutus/php/url/urlencode';

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
    protected $tag_rules: Record<string, TagRules>;  // List of tag rules currently in use.
    protected $defaults: BBCodeLibrary;  // The standard library (an instance of class BBCodeLibrary).
    protected $current_class: ClassType; // The current class (auto-computed).
    protected $root_class: ClassType; // The root container class.
    protected $lost_start_tags; // For repair when tags are badly mis-nested.
    protected $start_tags; // An associative array of locations of start tags on the stack.
    protected $allow_ampersand: boolean; // If true, we use str_replace() instead of htmlspecialchars().
    protected $tag_marker: string; // Set to '[', '<', '{', or '('.
    protected $ignore_newlines; // If true, newlines will be treated as normal whitespace.
    protected $plain_mode: boolean; // Don't output tags:  Just output text/whitespace/newlines only.
    protected $detect_urls: boolean; // Should we audo-detect URLs and convert them to links?
    protected $url_pattern: string; // What to convert auto-detected URLs into.
    protected $output_limit: number; // The maximum number of text characters to output.
    protected $text_length: number; // The number of text characters output so far.
    protected $was_limited: boolean; // Set to true if the output was cut off.
    protected $limit_tail: string; // What to add if the output is cut off.
    protected $limit_precision: number; // How accurate should we be if we're cutting off text?
    protected $smiley_dir: string; // The host filesystem path to smileys (should be an absolute path).
    protected $smiley_url: string; // The URL path to smileys (possibly a relative path).
    protected $smileys;  // The current list of smileys.
    protected $smiley_regex; // This is a regex, precomputed from the list of smileys above.
    protected $enable_smileys: boolean; // Whether or not to perform smiley-parsing.
    protected $wiki_url: string;  // URL prefix used for [[wiki]] links.
    protected $local_img_dir: string; // The host filesystem path to local images (should be an absolute path).
    protected $local_img_url: string; // The URL path to local images (possibly a relative path).
    protected $url_targetable: boolean; // If true, [url] tags can accept a target="+.+" parameter.
    protected $url_target: boolean | string; // If non-false, [url] tags will use this target and no other.
    protected $url_template: string; // The default template used with the default [url] tag.
    protected $quote_template: string; // The default template used with the default [quote] tag.
    protected $wiki_url_template: string; // The default template used when rendering wiki links.
    protected $email_template: string; // The default template used with the default [email] tag.
    protected $rule_html;  // The default HTML to output for a [rule] tag.
    protected $pre_trim: string;  // How to trim the whitespace at the start of the input.
    protected $post_trim: string;  // How to trim the whitespace at the end of the input.
    public $debug: boolean;   // Enable debugging mode
    protected $max_smileys: number; // Maximum number of smileys that can be used in parse
    protected $escape_content: boolean; // Encode HTML. POTENTIALLY DANGEROUS IF DISABLED. ONLY DISABLE IF YOU KNOW WHAT YOURE DOING.
    protected $stack: StackType[];
    protected $lexer: BBCodeLexer;
    /**
     * Initialize a new instance of the {@link BBCode} class.
     *
     * @param BBCodeLibrary|null $library
     */
    public constructor($library: BBCodeLibrary | null = null) {
        this.$defaults = $library ? $library : new BBCodeLibrary();
        this.$tag_rules = this.$defaults.$default_tag_rules;
        this.$smileys = this.$defaults.$default_smileys;
        this.$enable_smileys = true;
        this.$smiley_regex = false;
        this.$smiley_dir = this.getDefaultSmileyDir();
        this.$smiley_url = this.getDefaultSmileyURL();
        this.$wiki_url = this.getDefaultWikiURL();
        this.$local_img_dir = this.getDefaultLocalImgDir();
        this.$local_img_url = this.getDefaultLocalImgURL();
        this.$rule_html = this.getDefaultRuleHTML();
        this.$pre_trim = "";
        this.$post_trim = "";
        this.$root_class = 'block';
        this.$lost_start_tags = [];
        this.$start_tags = [];
        this.$tag_marker = '[';
        this.$allow_ampersand = false;
        this.$current_class = this.$root_class;
        this.$debug = false;
        this.$ignore_newlines = false;
        this.$output_limit = 0;
        this.$plain_mode = false;
        this.$was_limited = false;
        this.$limit_tail = "...";
        this.$limit_precision = 0.15;
        this.$detect_urls = false;
        this.$url_pattern = '<a href="{$url/h}">{$text/h}</a>';
        this.$url_targetable = false;
        this.$url_target = false;
        this.$url_template = '<a href="{$url/h}" class="bbcode_url"{$target/v}>{$content/v}</a>';
        this.$quote_template = "\n" + '<div class="bbcode_quote">' + "\n" + '<div class="bbcode_quote_head">{$title/v}</div>' + "\n";
        this.$quote_template += '<div class="bbcode_quote_body">{$content/v}</div>' + "\n</div>\n";
        this.$wiki_url_template = '<a href="{$wikiURL/v}{$name/v}" class="bbcode_wiki">{$title/h}</a>';
        this.$email_template = '<a href="mailto:{$email/h}" class="bbcode_email">{$content/v}</a>';
        this.$max_smileys = -1;
        this.$escape_content = true;
        this.$stack = [];
    }
    //-----------------------------------------------------------------------------
    // State control.
    public setPreTrim($trim = "a") {
        this.$pre_trim = $trim;
        return this;
    }
    public getPreTrim() {
        return this.$pre_trim;
    }
    public setPostTrim($trim = "a") {
        this.$post_trim = $trim;
        return this;
    }
    public getPostTrim() {
        return this.$post_trim;
    }
    public setRoot($class: ClassType = 'block') {
        this.$root_class = $class;
        return this;
    }
    public setRootInline() {
        this.$root_class = 'inline';
        return this;
    }
    public setRootBlock() {
        this.$root_class = 'block';
        return this;
    }
    public getRoot() {
        return this.$root_class;
    }
    public setDebug($enable = true) {
        this.$debug = $enable;
        return this;
    }
    public getDebug() {
        return this.$debug;
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
    public setAllowAmpersand($enable = true) {
        this.$allow_ampersand = $enable;
        return this;
    }
    public getAllowAmpersand() {
        return this.$allow_ampersand;
    }
    public setTagMarker($marker = '[') {
        this.$tag_marker = $marker;
        return this;
    }
    public getTagMarker() {
        return this.$tag_marker;
    }
    public setIgnoreNewlines($ignore = true) {
        this.$ignore_newlines = $ignore;
        return this;
    }
    public getIgnoreNewlines() {
        return this.$ignore_newlines;
    }
    public setLimit($limit = 0) {
        this.$output_limit = $limit;
        return this;
    }
    public getLimit() {
        return this.$output_limit;
    }
    public setLimitTail($tail = "...") {
        this.$limit_tail = $tail;
        return this;
    }
    public getLimitTail() {
        return this.$limit_tail;
    }
    public setLimitPrecision($prec = 0.15) {
        this.$limit_precision = $prec;
        return this;
    }
    public getLimitPrecision() {
        return this.$limit_precision;
    }
    public wasLimited() {
        return this.$was_limited;
    }
    public setPlainMode($enable = true) {
        this.$plain_mode = $enable;
        return this;
    }
    public getPlainMode() {
        return this.$plain_mode;
    }
    public setDetectURLs($enable = true) {
        this.$detect_urls = $enable;
        return this;
    }
    public getDetectURLs() {
        return this.$detect_urls;
    }
    public setURLPattern($pattern) {
        this.$url_pattern = $pattern;
        return this;
    }
    public getURLPattern() {
        return this.$url_pattern;
    }
    public setURLTargetable($enable: boolean) {
        this.$url_targetable = $enable;
        return this;
    }
    public getURLTargetable() {
        return this.$url_targetable;
    }
    public setURLTarget($target) {
        this.$url_target = $target;
        return this;
    }
    public getURLTarget() {
        return this.$url_target;
    }
    public setURLTemplate($template) {
        this.$url_template = $template;
        return this;
    }
    public getURLTemplate() {
        return this.$url_template;
    }
    public setQuoteTemplate($template) {
        this.$quote_template = $template;
        return this;
    }
    public getQuoteTemplate() {
        return this.$quote_template;
    }
    public setWikiURLTemplate($template) {
        this.$wiki_url_template = $template;
        return this;
    }
    public getWikiURLTemplate() {
        return this.$wiki_url_template;
    }
    public setEmailTemplate($template) {
        this.$email_template = $template;
        return this;
    }
    public getEmailTemplate() {
        return this.$email_template;
    }
    /**
     * Set the value for escape_content.
     *
     * @param bool $escape_content
     * @return this
     */
    public setEscapeContent($escape_content) {
        this.$escape_content = $escape_content;
        return this;
    }
    /**
     * Get the current value of escape_content.
     *
     * @return bool
     */
    public getEscapeContent() {
        return this.$escape_content;
    }
    //-----------------------------------------------------------------------------
    // Rule-management:  You can add your own custom tag rules, or use the defaults.
    // These are basically getter/setter functions that exist for convenience.
    public addRule($name: string, $rule: TagRules) {
        this.$tag_rules[$name] = $rule;
        return this;
    }
    public removeRule($name: string) {
        delete this.$tag_rules[$name];
        return this;
    }
    public getRule($name: string) {
        return this.$tag_rules[$name] ? this.$tag_rules[$name] : false;
    }
    public clearRules() {
        this.$tag_rules = {};
        return this;
    }
    public getDefaultRule($name: string) {
        return this.$defaults.$default_tag_rules[$name] ? this.$defaults.$default_tag_rules[$name] : false;
    }
    public setDefaultRule($name: string) {
        if (this.$defaults.$default_tag_rules[$name]) {
            this.addRule($name, this.$defaults.$default_tag_rules[$name]);
        } else {
            this.removeRule($name);
        }
    }
    public getDefaultRules() {
        return this.$defaults.$default_tag_rules;
    }
    public setDefaultRules() {
        this.$tag_rules = this.$defaults.$default_tag_rules;
        return this;
    }
    //-----------------------------------------------------------------------------
    // Handling for [[wiki]] and [[wiki|Wiki]] links and other replaced items.
    // These are basically getter/setter functions that exist for convenience.
    public setWikiURL($url: string) {
        this.$wiki_url = $url;
        return this;
    }
    public getWikiURL() {
        return this.$wiki_url;
    }
    public getDefaultWikiURL() {
        return '/?page=';
    }
    public setLocalImgDir($path) {
        this.$local_img_dir = $path;
        return this;
    }
    public getLocalImgDir() {
        return this.$local_img_dir;
    }
    public getDefaultLocalImgDir() {
        return "img";
    }
    public setLocalImgURL($path) {
        this.$local_img_url = rtrim($path, '/');
        return this;
    }
    public getLocalImgURL() {
        return this.$local_img_url;
    }
    public getDefaultLocalImgURL() {
        return "img";
    }
    public setRuleHTML($html) {
        this.$rule_html = $html;
        return this;
    }
    public getRuleHTML() {
        return this.$rule_html;
    }
    public getDefaultRuleHTML() {
        return "\n<hr class=\"bbcode_rule\" />\n";
    }
    //-----------------------------------------------------------------------------
    // Smiley management.  You can use the default smileys, or add your own.
    // These are *mostly* getter/setter functions, but they also affect the
    // caching of the smiley-processing rules.
    public addSmiley($code, $image) {
        this.$smileys[$code] = $image;
        this.$smiley_regex = false;
        return this;
    }
    public removeSmiley($code) {
        this.$smileys.split($code, 1);
        this.$smiley_regex = false;
        return this;
    }
    public getSmiley($code) {
        return this.$smileys[$code] ? this.$smileys[$code] : false;
    }
    public clearSmileys() {
        this.$smileys = [];
        this.$smiley_regex = false;
        return this;
    }
    public getDefaultSmiley($code) {
        return this.$defaults.$default_smileys[$code] ? this.$defaults.$default_smileys[$code] : false;
    }
    public setDefaultSmiley($code) {
        if (this.$defaults.$default_smileys[$code]) {
            this.$smileys[$code] = this.$defaults.$default_smileys[$code];
        }
        this.$smiley_regex = false;
        return this;
    }
    public getDefaultSmileys() {
        return this.$defaults.$default_smileys;
    }
    public setDefaultSmileys() {
        this.$smileys = this.$defaults.$default_smileys;
        this.$smiley_regex = false;
        return this;
    }
    public setSmileyDir($path) {
        this.$smiley_dir = $path;
        return this;
    }
    public getSmileyDir() {
        return this.$smiley_dir;
    }
    public getDefaultSmileyDir() {
        return "smileys";
    }
    public setSmileyURL($path) {
        this.$smiley_url = $path;
        return this;
    }
    public getSmileyURL() {
        return this.$smiley_url;
    }
    public getDefaultSmileyURL() {
        return "smileys";
    }
    public setEnableSmileys($enable = true) {
        this.$enable_smileys = $enable;
        return this;
    }
    public getEnableSmileys() {
        return this.$enable_smileys;
    }
    public setMaxSmileys($count) {
        this.$max_smileys = parseInt($count);
        if (this.$max_smileys < -1) {
            this.$max_smileys = -1;
        }
        return this;
    }
    public getMaxSmileys() {
        return this.$max_smileys;
    }
    //-----------------------------------------------------------------------------
    //  Smiley, URL, and HTML-conversion support routines.
    // Like PHP's built-in nl2br, but this one can convert Windows, Un*x, or Mac
    // newlines to a <br>, and regularizes the output to just use Un*x-style
    // newlines to boot.
    public nl2br($string: string): string {
        return preg_replace("/\\x0A|\\x0D|\\x0A\\x0D|\\x0D\\x0A/", "<br>\n", $string);
    }
    // This function comes straight from the PHP documentation on html_entity_decode,
    // and performs exactly the same function.  Unlike html_entity_decode, it
    // works on older versions of PHP (prior to 4.3.0).
    public unHTMLEncode($string: string): string {
        return html_entity_decode($string);
    }
    // This takes an arbitrary string and makes it a wiki-safe string:  It converts
    // all characters to be within [a-zA-Z0-9'",.:_-] by converting everything else to
    // _ characters, compacts multiple _ characters together, and trims initial and
    // trailing _ characters.  So, for example, [[Washington, D.C.]] would become
    // "Washington_D.C+", safe to pass through a URL or anywhere else.  All characters
    // in the extended-character range (0x7F-0xFF) will be URL-encoded.
    public wikify($string: string): string {
        //TODO: make sure double backslash before $ is fine
        return rawurlencode(str_replace(" ", "_", trim(preg_replace("/[!?;@#\\$%\\^&*<>=+`~\\x00-\\x20_-]+/", " ", $string))));
    }
    /**
     * Returns true if the given string is a valid URL.
     *
     * If $email_too is false, this checks for:
     *
     * ```
     * http :// domain [:port] [/] [any single-line string]
     * https :// domain [:port] [/] [any single-line string]
     * ftp :// domain [:port] [/] [any single-line string]
     * ```
     *
     * If $email_too is true (the default), this also allows the mailto protocol:
     *
     * ```
     * mailto : name @ domain
     * ```
     *
     * @param string $string The URL to validate.
     * @param bool $email_too Whether or not a **mailto:** link is also valid.
     * @return bool Returns **true** if {@link $string} is a valid URL or **false** otherwise.
     */
    public isValidURL($string: string, $email_too: boolean = true): boolean {
        // Validate using PHP's fast filter method.
        if (filter_var($string, 'FILTER_VALIDATE_URL') !== false &&
            in_array(parse_url($string, 'PHP_URL_SCHEME'), ['http', 'https', 'ftp'])) {
            return true;
        }
        // Check for anything that does *not* have a colon in it before the first
        // slash or question mark or #; that indicates a local file relative to us.
        if (preg_match("^[^:]+([\\/\\\\?#][^\\r\\n]*)?$", $string)) {
            return true;
        }
        // Match mail addresses.
        if ($email_too && substr($string, 0, 7) == "mailto:") {
            return this.isValidEmail(substr($string, 7));
        }
        return false;
    }
    /**
     * Returns true if the given string is a valid e-mail address.
     *
     * This allows everything that RFC821 allows, including e-mail addresses that make no sense.
     * @param string $string The email address to validate.
     * @return bool Returns **true** if {@link $string} is an email address or **false** otherwise.
     */
    public isValidEmail(string: string): boolean {
        /*const $result = filter_var($string, 'FILTER_VALIDATE_EMAIL');
        return $result !== false;*/
        const validator = new EmailAddressValidator();
        return validator.check_email_address(string);
    }
    /**
     * Escape HTML characters.
     *
     * This function is used to wrap around calls to htmlspecialchars() for
     * plain text so that you can add your own text-evaluation code if you want.
     * For example, you might want to make *foo* turn into <b>foo</b>, or
     * something like that.  The default behavior is just to call htmlspecialchars()
     * and be done with it, but if you inherit and override this function, you
     * can do pretty much anything you want.
     *
     * Note that htmlspecialchars() is still used directly for doing things like
     * cleaning up URLs in tags; this function is applied to *plain* *text* *only*.
     *
     * @param string $string The string to replace.
     * @return string Returns an encoded version of {@link $string}.
     */
    public htmlEncode($string: string): string {
        if (this.$escape_content) {
            if (!this.$allow_ampersand) {
                return htmlspecialchars($string);
            } else {
                return str_replace(['<', '>', '"'], ['&lt;', '&gt;', '&quot;'], $string);
            }
        } else {
            return $string;
        }
    }
    /**
     * Properly encode tag content.
     *
     * Go through a string containing plain text and do three things on it:
     * Replace < and > and & and " with HTML-safe equivalents, and replace
     * smileys like :-) with <img /> tags, and replace any embedded URLs
     * with <a href=...>...</a> links.
     *
     * @param string $string The string to process.
     * @return string Returns the processed version of {@link $string}.
     */
    public fixupOutput($string: string): string {
        Debugger.debug("FixupOutput: input:", $string);
        let $output;
        if (!this.$detect_urls) {
            // Easy case:  No URL-decoding, so don't take the time to do it.
            $output = this.processSmileys($string);
        } else {
            // Extract out any embedded URLs, and then process smileys and such on
            // any text in between them.  This necessarily means that URLs get
            // slightly higher priority than smileys do, although there really
            // shouldn't be any overlap if the user's choices of smileys are at
            // least reasonably intelligent.  (For example, declaring "foo.com"
            // or ":http:" to be smileys will probably not work, since the URL decoder
            // will likely capture those before the smiley decoder ever has a chance
            // at them.  But then you didn't want a smiley named "foo.com" anyway,
            // did you?)
            const $chunks = this.autoDetectURLs($string);
            $output = [];
            if ($chunks.length) {
                let $is_a_url = false;
                for (const $index in $chunks) {
                    const $chunk = $chunks[$index];
                    let $usechunk = $chunk;
                    if (!$is_a_url) {
                        $usechunk = this.processSmileys($chunk);
                    }
                    $output.push($usechunk);
                    $is_a_url = !$is_a_url;
                }
            }
            $output = $output.join("");
        }
        if (this.$debug)
            Debugger.debug("FixupOutput: output:", $output);
        return $output;
    }
    /**
     * Replace the smiley codes in a string with image tags.
     *
     * Go through a string containing plain text and do two things on it:
     * Replace < and > and & and " with HTML-safe equivalents, and replace
     * smileys like :-) with <img /> tags.
     *
     * @param string $string The string to process.
     * @return string Returns the processed version of {@link $string}.
     */
    protected processSmileys($string: string): string {
        let $output;
        if (!this.$enable_smileys || this.$plain_mode) {
            // If smileys are turned off, don't convert them.
            $output = this.htmlEncode($string);
        } else {
            // If the smileys need to be computed, process them now.
            if (this.$smiley_regex === false) {
                this.rebuildSmileys();
            }
            // Split the string so that it consists of alternating pairs of smileys and non-smileys.
            const $tokens = preg_split(this.$smiley_regex, $string, -1, PREG_SPLIT_DELIM_CAPTURE);
            if ($tokens.length <= 1) {
                // Special (common) case:  This skips the smiley constructor if there
                // were no smileys found, which is most of the time.
                $output = this.htmlEncode($string);
            } else {
                $output = "";
                let $is_a_smiley = false;
                let $smiley_count = 0;
                for (const $token of $tokens) {
                    if (!$is_a_smiley) {
                        // For non-smiley text, we just pass it through htmlspecialchars.
                        $output += this.htmlEncode($token);
                    } else {
                        const $alt = htmlspecialchars($token);
                        if ($smiley_count < this.$max_smileys || this.$max_smileys < 0) {
                            $output += "<img src=\""+htmlspecialchars(this.$smiley_url+'/'+this.$smileys[$token])+'"'
                                //+ "\" width=\"{$info[ 0 ]}\" height=\"{$info[ 1 ]}\""
                                +` alt="${$alt}" title="${$alt}" class="bbcode_smiley" />`;
                        } else {
                            $output += $token;
                        }
                        $smiley_count++;
                    }
                    $is_a_smiley = !$is_a_smiley;
                }
            }
        }
        return $output;
    }
    protected rebuildSmileys() {
        // Construct the this.$smiley_regex that can recognize all
        // of the smileys.  This will save us a lot of computation time
        // in this.$Parse() if multiple BBCode strings are being
        // processed by the same script.
        const $regex = ["/(?<![\\w])("];
        let $first = true;
        for (const $code in this.$smileys) {
            const $filename = this.$smileys[$code];
            if (!$first)
                $regex.push("|");
            $regex.push(preg_quote($code, '/'));
            $first = false;
        }
        $regex.push(")(?![\\w])/");
        this.$smiley_regex = $regex.join("");
        if (this.$debug)
            Debugger.debug("Internal_RebuildSmileys: regex:", this.$smiley_regex);
    }
    /*
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
     * We use the same split-and-match technique used by the lexer and the smiley parser,
     * since it's the fastest way to perform tokenization in PHP.
     *
     * Once we find the URL, we convert it according to the rule given in this.$url_pattern.
     *
     * Note that the input string is plain text, not HTML or BBCode.  The return value
     * must be an array of alternating pairs of plain text (even indexes) and HTML (odd indexes).
     *
     * @param string $string The string to detect the URLs in.
     * @return array Returns an array in the form `[text, anchor, text, anchor, ...]`.
     */
    protected autoDetectURLs($string: string) {
        const $hostRegex = /** @lang RegExp */
        "(?:" //host
            +"(?:[a-zA-Z0-9_-]+(?:\\.[a-zA-Z0-9_-]+)*\\.[a-z]{2,}(?::\\d+)?)" //domain name
            +"|(?:\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}(?::\\d+)?)" //ip address
        +")";

        const $urlRegex = /** @lang RegExp */
        "(?:" //url
            +"(?:(?:https?|ftp):\\/\\/)?" //optional scheme
            +`${$hostRegex}` //host
            +"(?:"
                +"(?=[\\/?#])" //the part after the domain must be one of these characters
                +"[@a-zA-Z0-9!#-'*-.:;\\/;?-z~=]*[a-zA-Z0-9#\\/=]"
            +")?" //path, query string etc
        +")";

        const $emailRegex = /** @lang RegExp */
        "(?:" //email
            +"[a-zA-Z0-9._-]+"
            +"@[a-zA-Z0-9_-]+(?:\\.[a-zA-Z0-9_-]+)*\\.[a-z]{2,}" //domain name
        +")";
        
        const $regex = /** @lang RegExp */
        "/"
        +"(?<=^|[\\s(])" //url starts at beginning, after space, within parentheses
        +"("
            +`${$urlRegex}`
            +`|${$emailRegex}`
        +")"
        +"(?=$|[\\s)]|[.!?;]($|[\\s]))" //url ends at the end, before space, within parentheses, before punctuation
        +"/Dx";

        const $parts = preg_split($regex, $string, -1, PREG_SPLIT_DELIM_CAPTURE);
        const $result = [];
        let $isURL = false;
        for (const $part of $parts) {
            let $urlParts;
            if (strpos($part, ' ') !== false) {
                $urlParts = false;
            } else {
                $urlParts = parse_url($part);
            }
            // Fix parts that are just single domains.
            if ($urlParts !== false && preg_match(`^${$hostRegex}$`, $part)) {
                $urlParts['host'] = $part;
                delete $urlParts['path'];
            }
            // Look for an email address.
            if (preg_match(`^${$emailRegex}$`, $part)) {
                $urlParts = {
                    'url': `mailto:${$part}`,
                    'host': $part
                };
            }
            const validTLDIP = this.isValidTLD($urlParts['host'], true);
            // The TLD should be validated when there is no scheme.
            if ($urlParts !== false && empty($urlParts['scheme']) && !empty($urlParts['host'])
                && !validTLDIP) {
                $urlParts = false;
            }
            if (!empty($urlParts['scheme']) && empty($urlParts['host']) && validTLDIP) {
                $urlParts['host'] = $urlParts['scheme'];
            }
            if ($urlParts === false || empty($urlParts['host'])) {
                // Fix wrongly detected URL.
                if ($isURL) {
                    $result.push('');
                }
                $result.push($part);
            } else {
                // Fix wrongly detected text.
                if (!$isURL) {
                    $result.push('');
                }
                if (empty($urlParts['url'])) {
                    let $url = $part;
                    if (empty($urlParts['scheme']) || $urlParts['host'].startsWith($urlParts['scheme'])) {
                        $url = 'http://'+$part;
                    }
                    $urlParts['url'] = $url;
                }
                $urlParts['link'] = $urlParts['url'];
                $urlParts['text'] = $part;
                $result.push(this.fillTemplate(this.$url_pattern, $urlParts));
            }
            $isURL = !$isURL;
        }
        return $result;
    }
    /**
     * Check that a host name has a valid top level domain.
     *
     * @param string $host The host or TLD to check.
     * @param bool $allowIPs Whether or not IPv4 strings should count as valid.
     * @return bool Returns **true** if {@link $host} has a valid TLD or **false** otherwise.
     */
    public isValidTLD($host: string, $allowIPs: boolean = false): boolean {
        const $validTLDs = [
            'aero', 'arpa', 'biz', 'com', 'coop', 'dev', 'edu', 'example', 'gov', 'org', 'info', 'int', 'invalid',
            'local', 'mil', 'museum', 'name', 'net', 'onion', 'pro', 'swift', 'test'
        ];
        // An IP address should be considered okay.
        if ($allowIPs && filter_var($host, 'FILTER_VALIDATE_IP') !== false) {
            return true;
        }
        // Only localhost is allowed if there is no TLD.
        if (strpos($host, '.') === false) {
            return $host === 'localhost';
        }
        // Strip the TLD portion from the string.
        const $tld = trim(strrchr($host, '.'), '.');
        // Check against the known TLDs.
        // We'll just assume that two letter TLDs are valid to avoid too many checks.
        if (in_array($tld, $validTLDs) || preg_match('^[a-z]{2}$', $tld)) {
            return true;
        }
        return false;
    }
    // Fill an HTML template using variable inserts, which look like this:
    //    {$variable}   or   {$variable/flags}   or even   {$myarray.george.father/flags}
    //
    // You may use any variable provided in the parameter array; and you may use the
    // special dot (.) operator to access members of array variables or of object
    // variables.
    //
    // You may add formatting flags to the variable to control how the text parameters
    // are cleaned up.  For example, {$variable/u} causes the variable to be urlencoded().
    // The available flags are:
    //
    //   v - Verbatim.  Do not apply any formatting to the variable; use its exact text,
    //        however the user provided it.  This overrides all other flags.
    //
    //   b - Apply basename().
    //   n - Apply nl2br().
    //   t - Trim.  This causes all initial and trailing whitespace to be trimmed (removed).
    //   w - Clean up whitespace.  This causes all non-newline whitespace, such as
    //        control codes and tabs, to be collapsed into individual space characters.
    //
    //   e - Apply HTMLEncode().
    //   h - Apply htmlspecialchars().
    //   k - Apply Wikify().
    //   u - Apply urlencode().
    //
    // Note that only one of the e, h, k, or u "formatting flags" may be specified;
    // these flags are mutually-exclusive.
    public fillTemplate($template: string, $insert_array: Record<string, string>, $default_array = []) {
        const $pieces = $template.split(/(\{\$[a-zA-Z0-9_.:/-]+\})/);
        // Special (common) high-speed case:  No inserts found in the template.
        if ($pieces.length <= 1)
            return $template;
        const $result = [];
        let $is_an_insert = false;
        for (const $piece of $pieces) {
            let $matches, $value, $flags;
            if (!$is_an_insert) {
                if (this.$debug)
                    Debugger.debug("FormatInserts: add text:", $piece);
                $result.push($piece);
            } else if (!($matches = $piece.match(/\{\$([a-zA-Z0-9_:-]+)((?:\\.[a-zA-Z0-9_:-]+)*)(?:\/([a-zA-Z0-9_:-]+))?\}/))) {
                if (this.$debug)
                    Debugger.debug("FormatInserts: not an insert: add as text:", $piece);
                $result.push($piece);
            } else {
                // We have a valid variable name, possibly with an index and some flags.
                // Locate the requested variable in the input parameters.
                if ($insert_array[$matches[1]]) {
                    $value = $insert_array[$matches[1]];
                } else {
                    $value = $default_array[$matches[1]] ? $default_array[$matches[1]] : null;
                }
                if (!empty($matches[2])) {
                    // We have one or more indexes, so break them apart and look up the requested data.
                    for (const $index of $matches[2].substring(1).split(".")) {
                        if (typeof $value == "object") {
                            $value = $value[$index] ? $value[$index] : null;
                        } else {
                            $value = '';
                        }
                    }
                }
                // Make sure the resulting value is a printable string.
                switch (typeof $value) {
                case 'boolean':
                    $value = $value ? "true" : "false";
                    break;
                case 'number':
                    $value = $value+'';
                    break;
                case 'bigint':
                    $value = $value+'';
                    break;
                case 'string':
                    break;
                default:
                    $value = "";
                    break;
                }
                // See if there are any flags.
                if (!empty($matches[3])) {
                    $flags = array_flip($matches[3].split(''));
                } else {
                    $flags = [];
                }
                // If there are flags, process the value according to them.
                if (!$flags['v']) {
                    if ($flags['w']) {
                        $value = preg_replace("/[\\x00-\\x09\\x0B-\x0C\x0E-\\x20]+/", " ", $value);
                    }
                    if ($flags['t']) {
                        $value = $value.trim();
                    }
                    if ($flags['b']) {
                        $value = basename($value);
                    }
                    if ($flags['e']) {
                        $value = this.htmlEncode($value);
                    } else if ($flags['k']) {
                        $value = this.wikify($value);
                    } else if ($flags['h']) {
                        $value = htmlspecialchars($value);
                    } else if ($flags['u']) {
                        $value = urlencode($value);
                    }
                    if ($flags['n']) {
                        $value = this.nl2br($value);
                    }
                }
                if (this.$debug)
                    Debugger.debug("FormatInserts: add insert:", `"${$piece}" -> "${$value}"`);
                // Append the value to the output.
                $result.push($value);
            }
            $is_an_insert = !$is_an_insert;
        }
        return $result.join("");
    }
    ///  Stack and output-management (internal). ///
    /**
     * Collect a series of text strings from a token stack and return them as a single string.
     *
     * We use output buffering because it seems to produce slightly more efficient string concatenation.
     *
     * @param array $array The token stack.
     * @param int $start The starting index in {@link $array} to process.
     * @return string Returns the stack text from all the elements in the stack.
     */
    protected collectText($array, $start = 0) {
        let $output = "";
        for (let $startnum = parseInt($start+''), $end = $array.length; $start < $end; $start++) {
            $output += $array[$start][BBStack.TEXT];
        }
        return $output;
    }
    protected collectTextReverse($array, $start = 0, $end = 0) {
        let $output = "";
        for ($start = parseInt($start+''); $start >= $end; $start--) {
            $output += $array[$start][BBStack.TEXT];
        }
        return $output;
    }
    /**
     * Output everything on the stack from $pos to the top, inclusive, as plain text, and return it.
     *
     * This is a little more complicated than necessary, because if we encounter end-tag-optional tags in here, they're
     * not to be outputted as plain text:  They're fully legit, and need to be processed with the plain text after them
     * as their body. This returns a list of tokens in the REVERSE of output order.
     *
     * @param int $pos The position to start on the stack.
     * @return array Returns an array of output tokens.
     */
    protected generateOutput($pos: number) {
        if (this.$debug) {
            Debugger.debug("Internal_GenerateOutput:", `from=${$pos} len=${this.$stack.length - $pos}`);
            Debugger.debug("Internal_GenerateOutput: Stack contents:", this.dumpStack());
        }
        let $output = [];
        while (this.$stack.length > $pos) {
            const $token = this.$stack.pop();
            if ($token[BBStack.TOKEN] != BBToken.TAG) {
                // Not a tag, so just push it to the output.
                $output.push($token);
                if (this.$debug)
                    Debugger.debug("Internal_GenerateOutput: push text:", $token[BBStack.TEXT]);
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
                const $name = $token[BBStack.TAG]['_name'] ? $token[BBStack.TAG]['_name'] : null;
                let $rule = this.$tag_rules[$name] ? this.$tag_rules[$name] : null;
                let $tag_output;
                // Add default to the rule.
                $rule = {...{
                    'end_tag': BBType.REQUIRED, 
                    'before_endtag': null, 
                    'after_tag': null, 
                    'before_tag': null
                }, ...$rule};
                const $end_tag = $rule['end_tag'];
                this.$start_tags[$name].pop(); // Remove the locator for this tag.
                if ($end_tag == BBType.PROHIBIT) {
                    // Broken tag, so just push it to the output as HTML.
                    $output.push({
                        [BBStack.TOKEN]: BBToken.TEXT,
                        [BBStack.TAG]: false,
                        [BBStack.TEXT]: $token[BBStack.TEXT],
                        [BBStack.CLASS]: this.$current_class,
                    });
                    if (this.$debug)
                        Debugger.debug("Internal_GenerateOutput: push broken tag:", $token['text']);
                } else {
                    // Found a start tag where the end tag is optional, or a start
                    // tag where the end tag was forgotten, so that tag should be
                    // processed with the current output as its content.
                    if (this.$debug)
                        Debugger.debug("Internal_GenerateOutput: found start tag with optional end tag:", $token[BBStack.TEXT]);
                    // If this was supposed to have an end tag, and we find a floating one
                    // later on, then we should consume it.
                    if ($end_tag == BBType.REQUIRED) {
                        if (!this.$lost_start_tags[$name]) {
                            this.$lost_start_tags[$name] = 0;
                        }
                        this.$lost_start_tags[$name]++;
                    }
                    const $end = this.cleanupWSByIteratingPointer($rule['before_endtag'], 0, $output);
                    this.cleanupWSByPoppingStack($rule['after_tag'], $output);
                    const $tag_body = this.collectTextReverse($output, $output.length - 1, $end);
                    // Note:  We don't process 'after_endtag' because the invisible end tag
                    // always butts up against another tag, so there's *never* any whitespace
                    // after it.  Attempting to process 'after_endtag' would just be a waste
                    // of time because it'd never match.  But 'before_tag' is useful, though.
                    this.cleanupWSByPoppingStack($rule['before_tag'], this.$stack);
                    if (this.$debug)
                        Debugger.debug("Internal_GenerateOutput: optional-tag's content: ", $tag_body);
                    if ($token[BBStack.TAG]) {
                        this.updateParamsForMissingEndTag($token[BBStack.TAG]);
                        $tag_output = this.doTag(
                            BBAction.OUTPUT,
                            $name,
                            $token[BBStack.TAG]['_default'] ? $token[BBStack.TAG]['_default'] : null,
                            $token[BBStack.TAG],
                            $tag_body
                        );
                    } else {
                        $tag_output = this.doTag(
                            BBAction.OUTPUT,
                            $name,
                            null,
                            null,
                            $tag_body
                        );
                    }
                    if (this.$debug) {
                        Debugger.debug("Internal_GenerateOutput: push optional-tag's output: ", $tag_output);
                    }
                    $output = [{
                        [BBStack.TOKEN]: BBToken.TEXT,
                        [BBStack.TAG]: false,
                        [BBStack.TEXT]: $tag_output,
                        [BBStack.CLASS]: this.$current_class
                    }];
                }
            }
        }
        if (this.$debug) {
            Debugger.debug("Internal_GenerateOutput: done; output contains "+$output.length+" items:", this.dumpStack($output));
            const $noutput = this.collectTextReverse($output, $output.length - 1);
            Debugger.debug("Internal_GenerateOutput: output:", $noutput);
            Debugger.debug("Internal_GenerateOutput: Stack contents:", this.dumpStack());
        }
        this.computeCurrentClass();
        return $output;
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
    protected rewindToClass($class_list) {
        if (this.$debug) {
            Debugger.debug(`Internal_RewindToClass:</b> stack has ${this.$stack.length} items; allowed classes are:`, $class_list);
        }
        // Walk backward from the top of the stack, searching for a state where
        // the new class was still legal.
        let $pos = this.$stack.length - 1;
        while ($pos >= 0 && !in_array(this.$stack[$pos][BBStack.CLASS], $class_list))
            $pos--;
        if ($pos < 0) {
            if (!in_array(this.$root_class, $class_list))
                return false;
        }
        if (this.$debug)
            Debugger.debug("Internal_RewindToClass:", `rewound to ${($pos + 1)}`);
        // Convert any tags on the stack from $pos+1 to the top, inclusive, to
        // plain text tokens, possibly processing any tags where the end tags
        // are optional.
        const $output = this.generateOutput($pos + 1);
        // Push the clean tokens back onto the stack.
        while ($output.length) {
            const $token = $output.pop();
            $token[BBStack.CLASS] = this.$current_class;
            this.$stack.push($token);
        }
        if (this.$debug) {
            Debugger.debug("Internal_RewindToClass:", `stack has ${this.$stack.length} items now.`);
        }
        return true;
    }
    // We've found an end tag with the given name, so walk backward until we
    // find the start tag, and then output the contents.
    protected finishTag($tag_name: string) {
        if (this.$debug) {
            Debugger.debug("Internal_FinishTag:", `stack has ${this.$stack.length} items; searching for start tag for [${$tag_name}]`);
        }
        let $pos, $newpos, $newend;
        // If this is a malformed tag like [/], tell them now, since there's
        // no way we can possibly match it.
        if (!$tag_name || $tag_name.length <= 0)
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
        if (this.$start_tags[$tag_name] && this.$start_tags[$tag_name].length)
            $pos = this.$start_tags[$tag_name].pop();
        else
            $pos = -1;
        if (this.$debug)
            Debugger.debug("Internal_FinishTag:", `rewound to ${$pos + 1}`);
        // If there is no matching start tag, then this is a floating (bad)
        // end tag, so tell the caller.
        if ($pos < 0)
            return false;
        // Okay, we're doing pretty good here.  We need to do whitespace
        // cleanup for after the start tag and before the end tag, though.  We
        // do end-tag cleanup by popping, and we do start-tag cleanup by skipping
        // $pos forward.  (We add one because we've actually rewound the stack
        // to the start tag itself.)
        if (this.$tag_rules[$tag_name] && this.$tag_rules[$tag_name]['after_tag']) {
            $newpos = this.cleanupWSByIteratingPointer(
                this.$tag_rules[$tag_name]['after_tag'] ? this.$tag_rules[$tag_name]['after_tag'] : null,
                $pos + 1,
                this.$stack
            );
        } else {
            $newpos = this.cleanupWSByIteratingPointer(null, $pos + 1, this.$stack);
        }
        let $delta = $newpos - ($pos + 1);
        if (this.$debug) {
            Debugger.debug("Internal_FinishTag:", `whitespace cleanup (rule was "${this.$tag_rules[$tag_name]['after_tag']}") moved pointer to ${$newpos}`);
        }
        // Output everything on the stack from $pos to the top, inclusive, as
        // plain text, and then return it as a string, leaving the start tag on
        // the top of the stack.
        const $output = this.generateOutput($newpos);
        // Clean off any whitespace before the end tag that doesn't belong there.
        if (this.$tag_rules[$tag_name] && this.$tag_rules[$tag_name]['before_endtag']) {
            $newend = this.cleanupWSByIteratingPointer(this.$tag_rules[$tag_name]['before_endtag'], 0, $output);
        } else {
            $newend = this.cleanupWSByIteratingPointer(null, 0, $output);
        }
        const $fulloutput = this.collectTextReverse($output, $output.length - 1, $newend);
        if (this.$debug)
            Debugger.debug("Internal_FinishTag:", `whitespace cleanup: popping ${$delta} items`);
        // Clean up any 'after_tag' whitespace we skipped.
        while ($delta-- > 0)
            this.$stack.pop();
        this.computeCurrentClass();
        if (this.$debug)
            Debugger.debug("Internal_FinishTag: output:", $fulloutput);
        return $fulloutput;
    }
    // Recompute the current class, based on the class of the stack's top element.
    protected computeCurrentClass() {
        if (this.$stack.length > 0)
            this.$current_class = this.$stack[this.$stack.length - 1][BBStack.CLASS];
        else
            this.$current_class = this.$root_class;
        if (this.$debug) {
            Debugger.debug("Internal_ComputeCurrentClass:", `current class is now "${this.$current_class}"`);
        }
    }
    // Given a stack of tokens in $array, write it to a string (possibly with HTML
    // color and style encodings for readability, if $raw is false).
    protected dumpStack($array?: any[], $raw = false) {
        let $string;
        if (!$raw)
            $string = "<span style='color: #00C;'>";
        else
            $string = "";
        if (!$array)
            $array = this.$stack;
        for (let $item of $array) {
            const $genitem = {
                [BBStack.TOKEN]: null, 
                [BBStack.TEXT]: null, 
                [BBStack.TAG]: {
                    '_name': ''
                }
            };
            $item = {...$genitem, ...$item};
            switch ($item[BBStack.TOKEN]) {
            case BBToken.TEXT:
                $string += "\""+htmlspecialchars($item[BBStack.TEXT])+"\" ";
                break;
            case BBToken.WS:
                $string += "WS ";
                break;
            case BBToken.NL:
                $string += "NL ";
                break;
            case BBToken.TAG:
                $string += "["+htmlspecialchars($item[BBStack.TAG]['_name'])+"] ";
                break;
            default:
                $string += "unknown ";
                break;
            }
        }
        if (!$raw)
            $string += "</span>";
        return $string;
    }
    //-----------------------------------------------------------------------------
    //  Whitespace cleanup routines (internal).
    // Walk down from the top of the stack, and remove whitespace/newline tokens from
    // the top according to the rules in the given pattern.
    protected cleanupWSByPoppingStack($pattern: string, $array: any[]) {
        if (this.$debug) {
            Debugger.debug("Internal_CleanupWSByPoppingStack:", `array has ${$array.length} items; pattern="${$pattern}"`);
        }
        if (!$pattern)
            return;
        const $oldlen = $array.length;
        let $token;
        for (const $char of $pattern.split('')) {
            switch ($char) {
            case 's':
                while ($array.length > 0 && $array[$array.length - 1][BBStack.TOKEN] == BBToken.WS)
                    $array.pop();
                break;
            case 'n':
                if ($array.length > 0 && $array[$array.length - 1][BBStack.TOKEN] == BBToken.NL)
                    $array.pop();
                break;
            case 'a':
                while ($array.length > 0 && (($token = $array[$array.length - 1][BBStack.TOKEN]) == BBToken.WS || $token == BBToken.NL))
                    $array.pop();
                break;
            }
        }
        if (this.$debug) {
            Debugger.debug("Internal_CleanupWSByPoppingStack:", `array now has ${$array.length} items`);
            Debugger.debug("Internal_CleanupWSByPoppingStack: array:", this.dumpStack($array));
        }
        if ($array.length != $oldlen) {
            // We only recompute the class if something actually changed.
            this.computeCurrentClass();
        }
    }
    // Read tokens from the input, and remove whitespace/newline tokens from the input
    // according to the rules in the given pattern.
    protected cleanupWSByEatingInput($pattern: string) {
        if (this.$debug) {
            const $ptr = this.$lexer.$ptr;
            Debugger.debug("Internal_CleanupWSByEatingInput:", `input pointer is at ${$ptr}; pattern="${$pattern}"`);
        }
        if (!$pattern)
            return;
        let $token_type;
        for (const $char of $pattern.split('')) {
            switch ($char) {
            case 's':
                $token_type = this.$lexer.nextToken();
                while ($token_type == BBToken.WS) {
                    $token_type = this.$lexer.nextToken();
                }
                this.$lexer.ungetToken();
                break;
            case 'n':
                $token_type = this.$lexer.nextToken();
                if ($token_type != BBToken.NL)
                    this.$lexer.ungetToken();
                break;
            case 'a':
                $token_type = this.$lexer.nextToken();
                while ($token_type == BBToken.WS || $token_type == BBToken.NL) {
                    $token_type = this.$lexer.nextToken();
                }
                this.$lexer.ungetToken();
                break;
            }
        }
        if (this.$debug)
            Debugger.debug("Internal_CleanupWSByEatingInput:", `input pointer is now at ${this.$lexer.$ptr}`);
    }
    // Read tokens from the given position in the stack, going forward as we match
    // the rules in the given pattern.  Returns the first position *after* the pattern.
    protected cleanupWSByIteratingPointer($pattern: string, $pos: number, $array: any[]) {
        if (this.$debug) {
            Debugger.debug("Internal_CleanupWSByIteratingPointer:", `pointer is ${$pos}; pattern="${$pattern}"`);
        }
        if (!$pattern)
            return $pos;
        let $token;
        for (const $char of $pattern.split('')) {
            switch ($char) {
            case 's':
                while ($pos < $array.length && $array[$pos][BBStack.TOKEN] == BBToken.WS)
                    $pos++;
                break;
            case 'n':
                if ($pos < $array.length && $array[$pos][BBStack.TOKEN] == BBToken.NL)
                    $pos++;
                break;
            case 'a':
                while ($pos < $array.length && (($token = $array[$pos][BBStack.TOKEN]) == BBToken.WS || $token == BBToken.NL))
                    $pos++;
                break;
            }
        }
        if (this.$debug) {
            Debugger.debug("Internal_CleanupWSByIteratingPointer:", `pointer is now ${$pos}`);
            Debugger.debug("Internal_CleanupWSByIteratingPointer: array:", this.dumpStack($array));
        }
        return $pos;
    }
    // We have a string that's too long, so chop it off at a suitable break so that it's
    // no longer than $limit characters, if at all possible (if there's nowhere to break
    // before that, we just chop at $limit).
    protected limitText($string, $limit) {
        if (this.$debug) {
            Debugger.debug("Internal_LimitText:", `chopping string of length ${$string.length} at ${$limit}.`);
        }
        const $chunks = preg_split("/([\\x00-\\x20]+)/", $string, -1, PREG_SPLIT_DELIM_CAPTURE);
        let $output = "";
        for (const $chunk of $chunks) {
            if ($output.length + $chunk.length > $limit)
                break;
            $output += $chunk;
        }
        $output = $output.trimEnd();
        if (this.$debug)
            Debugger.debug("Internal_LimitText:", `resulting string is length ${$output.length}`);
        return $output;
    }
    // If we've reached the text limit, clean up the stack, push the limit tail,
    // set the we-hit-the-limit flag, and return.
    protected doLimit() {
        this.cleanupWSByPoppingStack("a", this.$stack);
        if (this.$limit_tail.length > 0) {
            this.$stack.push({
                [BBStack.TOKEN]: BBToken.TEXT,
                [BBStack.TEXT]: this.$limit_tail,
                [BBStack.TAG]: false,
                [BBStack.CLASS]: this.$current_class,
            });
        }
        this.$was_limited = true;
    }
    //-----------------------------------------------------------------------------
    //  Tag evaluation logic (internal).
    // Process a tag:
    //
    //   $action is one of BBCODE_CHECK or BBCODE_OUTPUT.  During BBCODE_CHECK, $contents
    //        will *always* be the empty string, and this function should return true if
    //        the tag is legal based on the available information; or it should return
    //        false if the tag is illegal.  During BBCODE_OUTPUT, $contents will always
    //        be valid, and this function should return HTML.
    //
    //   $tag_name is the name of the tag being processed.
    //
    //   $default_value is the default value given; for example, in [url=foo], it's "foo"+
    //        This value has NOT been passed through htmlspecialchars().
    //
    //   $params is an array of key: value parameters associated with the tag; for example,
    //        in [smiley src=smile alt=:-)], it's `['src': "smile", 'alt': ":-)"]`.
    //        These keys and values have NOT beel passed through htmlspecialchars().
    //
    //   $contents is the body of the tag during BBCODE_OUTPUT.  For example, in
    //        [b]Hello[/b], it's "Hello"+  THIS VALUE IS ALWAYS HTML, not BBCode.
    //
    // For BBCODE_CHECK, this must return true (if the tag definition is valid) or false
    // (if the tag definition is not valid); for BBCODE_OUTPUT, this function must return
    // HTML output.
    public doTag($action: BBAction, $tag_name: string, $default_value: string, $params: boolean | TagType, $contents: string) {
        let $tag_rule = this.$tag_rules[$tag_name] ? this.$tag_rules[$tag_name] : null;
        let $value, $plain_content, $possible_content, $content_list, $start, $end, $link, $result;
        switch ($action) {
        case BBAction.CHECK:
            if (this.$debug)
                Debugger.debug("DoTag:", `check tag [${$tag_name}]`);
            if ($tag_rule['allow']) {
                // An 'allow' array, if given, overrides the other check techniques.
                for (const $param in $tag_rule['allow']) {
                    const $pattern = $tag_rule['allow'][$param];
                    if ($param == '_content') {
                        $value = $contents;
                    } else if ($param == '_defaultcontent') {
                        if ($default_value.length) {
                            $value = $default_value;
                        } else {
                            $value = $contents;
                        }
                    } else {
                        if ($params[$param]) {
                            $value = $params[$param];
                        } else {
                            if ($tag_rule['default']) {
                                $value = $tag_rule['default'][$param] ? $tag_rule['default'][$param] : null;
                            } else {
                                $value = null;
                            }
                        }
                    }
                    if (this.$debug) {
                        Debugger.debug("<b>DoTag:", `check parameter "${$param}", value "${$value}", against "${$pattern}"`);
                    }
                    //TODO: Fix below
                    if (!(typeof $value == "string" && $value.match($pattern.slice(1,-1)))) {
                        if (this.$debug) 
                            Debugger.debug("DoTag:", `parameter "${$param}" failed 'allow' check."`);
                        
                        return false;
                    }
                }
                return true;
            }
            $result = true;
            if ($tag_rule['mode']) {
                $tag_rule = {...{'method': ''}, ...$tag_rule};
                switch ($tag_rule['mode']) {
                default:
                case BBMode.SIMPLE:
                    $result = true;
                    break;
                case BBMode.ENHANCED:
                    $result = true;
                    break;
                case BBMode.INTERNAL:
                    if (method_exists(this, $tag_rule['method'])) {
                        try {
                            $result = this[$tag_rule['method']](BBAction.CHECK, $tag_name, $default_value, $params, $contents);
                        } catch(error) {
                            Debugger.error(`Internal Function failed for tag: [${$tag_name}]:`, error);
                            $result = false;
                        }
                    } else {
                        Debugger.warn(`Internal Function not found, skipping tag: [${$tag_name}]`, '');
                        $result = false;
                    }
                    break;
                case BBMode.LIBRARY:
                    if (method_exists(this.$defaults, $tag_rule['method'])) {
                        try {
                            $result = this.$defaults[$tag_rule['method']](this, BBAction.CHECK, $tag_name, $default_value, $params, $contents);
                        } catch(error) {
                            Debugger.error(`Library Function failed for tag: [${$tag_name}]:`, error);
                            $result = false;
                        }
                    } else {
                        Debugger.warn(`Library Function not found, skipping tag: [${$tag_name}]`, '');
                        $result = false;
                    }
                    break;
                case BBMode.CALLBACK:
                    if (typeof $tag_rule['callback'] == "function" && typeof $params == "object") {
                        try {
                            $result = $tag_rule['callback'](this, BBAction.OUTPUT, $tag_name, $default_value, $params, $contents);
                        } catch(error) {
                            Debugger.error(`Callback failed for tag: [${$tag_name}]:`, error);
                            $result = false;
                        }
                    } else {
                        Debugger.warn(`Callback not found, skipping tag: [${$tag_name}]`, '');
                        $result = false;
                    }
                    break;
                }
            }
            if (this.$debug) {
                Debugger.debug("DoTag:", `tag [${$tag_name}] returned ${$result ? "true" : "false"}`);
            }
            return $result;
        case BBAction.OUTPUT:
            if (this.$debug) {
                Debugger.debug("DoTag:", `output tag [${$tag_name}]: contents=${$contents}`);
            }
            if (this.$plain_mode) {
                // In plain mode, we ignore the tag rules almost entirely, using just
                // the 'plain_start' and 'plain_end' before the content specified in
                // the 'plain_content' member.
                if (!$tag_rule['plain_content'])
                    $plain_content = ['_content'];
                else
                    $plain_content = $tag_rule['plain_content'];
                    // Find the requested content, in the order specified.
                $result = $possible_content = "";
                for (const $possible_content of $plain_content) {
                    if ($possible_content == '_content' && $contents.length > 0) {
                        $result = $contents;
                        break;
                    }
                    if ($params[$possible_content] && $params[$possible_content].length > 0) {
                        $result = htmlspecialchars($params[$possible_content]);
                        break;
                    }
                }
                if (this.$debug) {
                    $content_list = "";
                    for (const $possible_content of $plain_content)
                        $content_list += htmlspecialchars($possible_content)+",";
                    if (this.$debug)
                        Debugger.debug("DoTag:", `plain-mode tag; possible contents were (${$content_list}); using "${$possible_content}"`);
                }
                $start = $tag_rule['plain_start'];
                $end = $tag_rule['plain_end'];
                // If this is a link tag, figure out its target.
                if ($tag_rule['plain_link']) {
                    // Find the requested link target, in the order specified.
                    $link = $possible_content = "";
                    for (const $possible_content of $tag_rule['plain_link']) {
                        if ($possible_content == '_content' && $contents.length > 0) {
                            $link = this.unHTMLEncode(strip_tags($contents));
                            break;
                        }
                        if ($params[$possible_content] && $params[$possible_content].length > 0) {
                            $link = $params[$possible_content];
                            break;
                        }
                    }
                    let $urlparams = parse_url($link);
                    if (typeof $urlparams !== "object") {
                        $urlparams = {};
                    }
                    $urlparams.link = $link;
                    $urlparams.url = $link;
                    $start = this.fillTemplate($start, $urlparams);
                    $end = this.fillTemplate($end, $urlparams);
                }
                // Construct the plain output using the available content.
                return [$start,$result,$end].join('');
            }
            $tag_rule = {...{'mode': BBMode.SIMPLE}, ...$tag_rule};
            switch ($tag_rule['mode']) {
            default:
            case BBMode.SIMPLE:
                $result = [$tag_rule['simple_start'],$contents,$tag_rule['simple_end']].join('');
                break;
            case BBMode.ENHANCED:
                $result = this.doEnhancedTag($tag_rule, $params, $contents);
                break;
            case BBMode.INTERNAL:
                try {
                    $result = this[$tag_rule['method']](this, BBAction.OUTPUT, $tag_name, $default_value, $params, $contents);
                } catch(error) {
                    Debugger.error(`Internal Output failed for tag: ${$tag_name}; ${error}`);
                    return false;
                }
                break;
            case BBMode.LIBRARY:
                try {
                    $result = this.$defaults[$tag_rule['method']](this, BBAction.OUTPUT, $tag_name, $default_value, $params, $contents);
                } catch(error) {
                    Debugger.error(`Library Output failed for tag: ${$tag_name}; ${error}`);
                    return false;
                }
                break;
            case BBMode.CALLBACK:
                if (typeof $tag_rule['callback'] == "function" && typeof $params == "object") {
                    try {
                        $result = $tag_rule['callback'](this, BBAction.OUTPUT, $tag_name, $default_value, $params, $contents);
                    } catch(error) {
                        Debugger.error(`Callback failed for tag: ${$tag_name}; ${error}`);
                        return false;
                    }
                } else {
                    Debugger.warn(`Callback not found, skipping tag: ${$tag_name}`);
                    return false;
                }
                break;
            }
            if (this.$debug) {
                Debugger.debug("DoTag:", `output tag [${$tag_name}]: result=${$result}`);
            }
            return $result;
        default:
            if (this.$debug)
                Debugger.debug("DoTag:", `unknown action ${$action} requested.`);
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
    protected doEnhancedTag($tag_rule, $params, $contents) {
        // Set up the special "_content" and "_defaultcontent" parameters.
        $params['_content'] = $contents;
        $params['_defaultcontent'] = !empty($params['_default']) ? $params['_default'] : $contents;
        // Now use common template-formatting logic.
        if ($tag_rule['template']) {
            if ($tag_rule['default']) {
                return this.fillTemplate($tag_rule['template'], $params, $tag_rule['default']);
            } else {
                return this.fillTemplate($tag_rule['template'], $params, null);
            }
        } else {
            if ($tag_rule['default']) {
                return this.fillTemplate(null, $params, $tag_rule['default']);
            } else {
                return this.fillTemplate(null, $params, null);
            }
        }
    }
    //-----------------------------------------------------------------------------
    //  Parser token-processing routines (internal).
    // If an end-tag is required/optional but missing, we simulate it here so that the
    // rule handlers still see a valid '_endtag' parameter.  This way, all rules always
    // see valid '_endtag' parameters except for rules for isolated tags.
    protected updateParamsForMissingEndTag($params: boolean | TagType) {
        let $tail_marker;
        switch (this.$tag_marker) {
        case '[':
            $tail_marker = ']';
            break;
        case '<':
            $tail_marker = '>';
            break;
        case '{':
            $tail_marker = '}';
            break;
        case '(':
            $tail_marker = ')';
            break;
        default:
            $tail_marker = this.$tag_marker;
            break;
        }
        $params['_endtag'] = this.$tag_marker+'/'+$params['_name']+$tail_marker;
    }
    /**
     * Process an isolated tag, a tag that is not allowed to have an end tag.
     *
     * @param string $tag_name The name of the tag.
     * @param array $tag_params All of the parameters passed to the tag.
     * @param array $tag_rule The rule governing the tag.
     */
    protected processIsolatedTag($tag_name: string, $tag_params: boolean | TagType, $tag_rule: TagRules) {
        if (this.$debug) {
            Debugger.debug("ProcessIsolatedTag:", `tag [${$tag_name}] is isolated: no end tag allowed, so processing immediately.`);
        }
        $tag_rule = {...{
            "_default": null,
            "before_tag": null,
            "after_tag": null
        }, ...$tag_rule};
        // Ask this tag if its attributes are valid; this gives the tag
        // the option to say, no, I'm broken, don't try to process me.
        if (!this.doTag(BBAction.CHECK, $tag_name, $tag_params['_default'], $tag_params, "")) {
            if (this.$debug) {
                Debugger.debug("ProcessIsolatedTag:", `isolated tag [${$tag_name}] rejected its parameters; outputting as text after fixup.`);
            }
            this.$stack.push({
                [BBStack.TOKEN]: BBToken.TEXT,
                [BBStack.TEXT]: this.fixupOutput(this.$lexer.$text),
                [BBStack.TAG]: false,
                [BBStack.CLASS]: this.$current_class,
            });
            return;
        }
        this.cleanupWSByPoppingStack($tag_rule['before_tag'], this.$stack);
        const $output = this.doTag(BBAction.OUTPUT, $tag_name, $tag_params['_default'], $tag_params, "");
        this.cleanupWSByEatingInput($tag_rule['after_tag']);
        if (this.$debug) {
            Debugger.debug("ProcessIsolatedTag:", `isolated tag [${$tag_name}] is done; pushing its output: ${$output}`);
        }
        this.$stack.push({
            [BBStack.TOKEN]: BBToken.TEXT,
            [BBStack.TEXT]: $output,
            [BBStack.TAG]: false,
            [BBStack.CLASS]: this.$current_class,
        });
    }
    /**
     * Process a verbatim tag, a tag whose contents (body) must not be processed at all.
     *
     * @param string $tag_name The name of the tag.
     * @param array $tag_params All of the parameters passed to the tag.
     * @param array $tag_rule The rule governing the tag.
     */
    protected processVerbatimTag($tag_name: string, $tag_params: boolean | TagType, $tag_rule: TagRules) {
        // This tag is a special type that disallows all other formatting
        // tags within it and wants its contents reproduced verbatim until
        // its matching end tag.  We save the state of the lexer in case
        // we can't find an end tag, in which case we'll have to reject the
        // start tag as broken.
        const $state = this.$lexer.saveState();
        const $end_tag = this.$lexer.$tagmarker+"/"+$tag_name+this.$lexer.$end_tagmarker;
        if (this.$debug) {
            Debugger.debug("Internal_ProcessVerbatimTag:", `tag [${$tag_name}] uses verbatim content: searching for ${$end_tag}..."`);
        }
        // Push tokens until we find a matching end tag or end-of-input.
        const $start = this.$stack.length;
        this.$lexer.$verbatim = true;
        let $token_type: BBToken, $newstart, $end_tag_params, $text;
        while (($token_type = this.$lexer.nextToken()) != BBToken.EOI) {
            if (this.$lexer.$text.toLowerCase() == $end_tag.toLowerCase()) {
                // Found the end tag, so we're done.
                $end_tag_params = $end_tag;
                break;
            }
            if (this.$debug) {
                Debugger.debug("Internal_ProcessVerbatimTag:", `push: ${this.$lexer.$text}`);
            }
            // If this token pushes us past the output limit, split it up on a whitespace
            // boundary, add as much as we can, and then abort.
            if (this.$output_limit > 0 && this.$text_length + this.$lexer.$text.length >= this.$output_limit) {
                $text = this.limitText(this.$lexer.$text, this.$output_limit - this.$text_length);
                if ($text.length > 0) {
                    this.$text_length += $text.length;
                    this.$stack.push({
                        [BBStack.TOKEN]: BBToken.TEXT,
                        [BBStack.TEXT]: this.fixupOutput($text),
                        [BBStack.TAG]: false,
                        [BBStack.CLASS]: this.$current_class,
                    });
                }
                this.doLimit();
                break;
            }
            this.$text_length += this.$lexer.$text.length;
            this.$stack.push({
                [BBStack.TOKEN]: $token_type,
                [BBStack.TEXT]: htmlspecialchars(this.$lexer.$text),
                [BBStack.TAG]: this.$lexer.$tag,
                [BBStack.CLASS]: this.$current_class,
            });
        }
        this.$lexer.$verbatim = false;
        // We've collected a bunch of text for this tag.  Now, make sure it ended on
        // a valid end tag.
        if ($token_type == BBToken.EOI) {
            // No end tag, so we have to reject the start tag as broken, and
            // rewind the input back to where it was still sane.
            if (this.$debug) {
                Debugger.debug("Internal_ProcessVerbatimTag:", `no end tag; reached EOI, so rewind and push start tag as text after fixup."`);
            }
            this.$lexer.restoreState($state);
            // Rewind the stack too, since right now we've put all the stuff
            // since the code tag on, and it should be taken off.
            this.$stack = this.$stack.slice(0, $start);
            this.$stack.push({
                [BBStack.TOKEN]: BBToken.TEXT,
                [BBStack.TEXT]: this.fixupOutput(this.$lexer.$text),
                [BBStack.TAG]: false,
                [BBStack.CLASS]: this.$current_class,
            });
            return;
        }
        if (this.$debug)
            Debugger.debug("Internal_ProcessVerbatimTag:", "found end tag.");
        // Clean up whitespace everywhere except before the start tag.
        if ($tag_rule['after_tag']) {
            $newstart = this.cleanupWSByIteratingPointer($tag_rule['after_tag'], $start, this.$stack);
        } else {
            $newstart = this.cleanupWSByIteratingPointer(null, $start, this.$stack);
        }
        if ($tag_rule['before_endtag']) {
            this.cleanupWSByPoppingStack($tag_rule['before_endtag'], this.$stack);
        } else {
            this.cleanupWSByPoppingStack(null, this.$stack);
        }
        if ($tag_rule['after_endtag']) {
            this.cleanupWSByEatingInput($tag_rule['after_endtag']);
        } else {
            this.cleanupWSByEatingInput(null);
        }
        // Collect the output from $newstart to the top of the stack, and then
        // quickly pop off all of those tokens.
        const $content = this.collectText(this.$stack, $newstart);
        if (this.$debug) {
            Debugger.debug("Internal_ProcessVerbatimTag:", `removing stack elements starting at ${$start} (stack has ${this.$stack.length} elements).`);
        }
        this.$stack.splice($start);
        this.computeCurrentClass();
        // Clean up whitespace before the start tag (the tag was never pushed
        // onto the stack itself, so we don't need to remove it).
        if ($tag_rule['before_tag']) {
            this.cleanupWSByPoppingStack($tag_rule['before_tag'], this.$stack);
        } else {
            this.cleanupWSByPoppingStack(null, this.$stack);
        }
        // Found the end tag, so process this tag immediately with
        // the contents collected between them.  Note that we do NOT
        // pass the contents through htmlspecialchars or FixupOutput
        // or anything else that could sanitize it:  They asked for
        // verbatim contents, so they're going to get it.
        $tag_params['_endtag'] = $end_tag_params;
        $tag_params['_hasend'] = true;
        if (!$tag_params['_default']) {
            $tag_params['_default'] = null;
        }
        const $output = this.doTag(BBAction.OUTPUT, $tag_name, $tag_params['_default'], $tag_params, $content);
        if (this.$debug) {
            Debugger.debug("Internal_ProcessVerbatimTag:", `end of verbatim [${$tag_name}] tag processing; push output as text: ${$output}`);
        }
        this.$stack.push({
            [BBStack.TOKEN]: BBToken.TEXT,
            [BBStack.TEXT]: $output,
            [BBStack.TAG]: false,
            [BBStack.CLASS]: this.$current_class,
        });
    }
    /**
     * Called when the parser has read a Token.BBCODE_TAG token.
     */
    protected parseStartTagToken() {
        // Tags are somewhat complicated, because they have to do several things
        // all at once.  First, let's look up what we know about the tag we've
        // encountered.
        const $tag_params = this.$lexer.$tag;
        const $tag_name = $tag_params['_name'] ? $tag_params['_name'] : null;
        if (this.$debug) {
            Debugger.debug("Internal_ParseStartTagToken:", `got tag [${$tag_name}]`);
        }
        let $newclass;
        // Make sure this tag has been defined.
        if (!this.$tag_rules[$tag_name]) {
            if (this.$debug) {
                Debugger.debug("Internal_ParseStartTagToken:", `tag [${$tag_name}] does not exist; pushing as text after fixup."`);
            }
            // If there is no such tag with this name, then just push the text as
            // though it was plain text.
            this.$stack.push({
                [BBStack.TOKEN]: BBToken.TEXT,
                [BBStack.TEXT]: this.fixupOutput(this.$lexer.$text),
                [BBStack.TAG]: false,
                [BBStack.CLASS]: this.$current_class,
            });
            return;
        }
        // Check for tags that do not allow params
        if (this.$tag_rules[$tag_name]['allow_params']) {
            if (this.$tag_rules[$tag_name]['allow_params'] === false) {
                if ($tag_params['_params'].length > 1) {
                    // If there is no such tag with this name, then just push the text as
                    // though it was plain text.
                    this.$stack.push({
                        [BBStack.TOKEN]: BBToken.TEXT,
                        [BBStack.TEXT]: this.fixupOutput(this.$lexer.$text),
                        [BBStack.TAG]: false,
                        [BBStack.CLASS]: this.$current_class,
                    });
                    return;
                }
            }
        }
        const $tag_rule = this.$tag_rules[$tag_name];
        // We've got a known tag. See if it's valid inside this class; for example,
        // it's legal to put an inline tag inside a block tag, but not legal to put a
        // block tag inside an inline tag.
        const $allow_in = Array.isArray($tag_rule['allow_in']) ? $tag_rule['allow_in'] : [this.$root_class];
        if (!in_array(this.$current_class, $allow_in)) {
            // Not allowed.  Rewind the stack backward until it is allowed.
            if (this.$debug) {
                Debugger.debug("Internal_ParseStartTagToken:", `tag [${$tag_name}] is disallowed inside class ${this.$current_class}; rewinding stack to a safe class.`);
            }
            if (!this.rewindToClass($allow_in)) {
                if (this.$debug) {
                    Debugger.debug("Internal_ParseStartTagToken:", "no safe class exists; rejecting this tag as text after fixup.");
                }
                this.$stack.push({
                    [BBStack.TOKEN]: BBToken.TEXT,
                    [BBStack.TEXT]: this.fixupOutput(this.$lexer.$text),
                    [BBStack.TAG]: false,
                    [BBStack.CLASS]: this.$current_class,
                });
                return;
            }
        }
        // Okay, this tag is allowed (in theory).  Now we need to see whether it's
        // a tag that requires an end tag, or whether it's end-tag-optional, or whether
        // it's end-tag-prohibited.  If it's end-tag-prohibited, then we process it
        // right now (no content); otherwise, we push it onto the stack to defer
        // processing it until either its end tag is encountered or we reach EOI.
        const $end_tag = $tag_rule['end_tag'] ? $tag_rule['end_tag'] : BBType.REQUIRED;
        if ($end_tag == BBType.PROHIBIT) {
            // No end tag, so process this tag RIGHT NOW.
            this.processIsolatedTag($tag_name, $tag_params, $tag_rule);
            return;
        }
        // This tag has a BBCODE_REQUIRED or BBCODE_OPTIONAL end tag, so we have to
        // push this tag on the stack and defer its processing until we see its end tag.
        if (this.$debug) {
            Debugger.debug("Internal_ParseStartTagToken:", `tag [${$tag_name}] is allowed to have an end tag."`);
        }
        // Ask this tag if its attributes are valid; this gives the tag the option
        // to say, no, I'm broken, don't try to process me.
        if (!this.doTag(BBAction.CHECK, $tag_name, $tag_params['_default'] ? $tag_params['_default'] : null, $tag_params, "")) {
            if (this.$debug) {
                Debugger.debug("Internal_ParseStartTagToken:", `tag [${$tag_name}] rejected its parameters; outputting as text after fixup.`);
            }
            this.$stack.push({
                [BBStack.TOKEN]: BBToken.TEXT,
                [BBStack.TEXT]: this.fixupOutput(this.$lexer.$text),
                [BBStack.TAG]: false,
                [BBStack.CLASS]: this.$current_class,
            });
            return;
        }
        if ($tag_rule['content'] && $tag_rule['content'] == BBType.VERBATIM) {
            // Verbatim tags have to be handled specially, since they consume successive
            // input immediately.
            this.processVerbatimTag($tag_name, $tag_params, $tag_rule);
            return;
        }
        // This is a normal tag that has (or may have) an end tag, so just
        // push it onto the stack and wait for the end tag or the output
        // generator to clean it up.  The act of pushing this causes us to
        // switch to its class.
        if ($tag_rule['class'])
            $newclass = $tag_rule['class'];
        else
            $newclass = this.$root_class;
        if (this.$debug) {
            Debugger.debug("Internal_ParseStartTagToken:", `pushing tag [${$tag_name}] onto stack; switching to class ${$newclass}.`);
        }
        this.$stack.push({
            [BBStack.TOKEN]: this.$lexer.$token,
            [BBStack.TEXT]: this.fixupOutput(this.$lexer.$text),
            [BBStack.TAG]: this.$lexer.$tag,
            [BBStack.CLASS]: (this.$current_class = $newclass),
        });
        if (!this.$start_tags[$tag_name])
            this.$start_tags[$tag_name] = [this.$stack.length - 1];
        else
            this.$start_tags[$tag_name].push(this.$stack.length - 1);
    }
    /**
     * Called when the parser has read a this.BBCODE_ENDTAG token.
     */
    protected parseEndTagToken() {
        const $tag_params = this.$lexer.$tag;
        const $tag_name = $tag_params['_name'] ? $tag_params['_name'] : null;
        if (this.$debug) {
            Debugger.debug("Internal_ParseEndTagToken:",`got end tag [/${$tag_name}].`);
        }
        // Got an end tag.  Walk down the stack and see if there's a matching
        // start tag for it anywhere.  If we find one, we pack everything between
        // them as output HTML, and then have the tag format itself with that
        // content.
        const $contents = this.finishTag($tag_name);
        if ($contents === false) {
            // There's no start tag for this --- unless there was and it was in a bad
            // place.  If there's a start tag we can't reach, then swallow this end tag;
            // otherwise, just output this end tag itself as plain text.
            if (this.$debug) {
                Debugger.debug("Internal_ParseEndTagToken:", `no start tag for [/${$tag_name}]; push as text after fixup.`);
            }
            if (this.$lost_start_tags[$tag_name] && this.$lost_start_tags[$tag_name] > 0) {
                this.$lost_start_tags[$tag_name]--;
            } else {
                this.$stack.push({
                    [BBStack.TOKEN]: BBToken.TEXT,
                    [BBStack.TEXT]: this.fixupOutput(this.$lexer.$text),
                    [BBStack.TAG]: false,
                    [BBStack.CLASS]: this.$current_class,
                });
            }
            return;
        }
        // Found a start tag for this, so pop it off the stack, then process the
        // tag, and push the result back onto the stack as plain HTML.
        // We don't need to run a BBCODE_CHECK on the start tag, because it was already
        // done when the tag was pushed onto the stack.
        const $start_tag_node = this.$stack.pop();
        const $start_tag_params = $start_tag_node[BBStack.TAG];
        this.computeCurrentClass();
        if (this.$tag_rules[$tag_name] && this.$tag_rules[$tag_name]['before_tag']) {
            this.cleanupWSByPoppingStack(this.$tag_rules[$tag_name]['before_tag'], this.$stack);
        } else {
            this.cleanupWSByPoppingStack(null, this.$stack);
        }
        $start_tag_params['_endtag'] = $tag_params['_tag'];
        $start_tag_params['_hasend'] = true;
        const $output = this.doTag(
            BBAction.OUTPUT,
            $tag_name,
            $start_tag_params['_default'] ? $start_tag_params['_default'] : null,
            $start_tag_params,
            $contents
        );
        if (this.$tag_rules[$tag_name]['after_endtag']) {
            this.cleanupWSByEatingInput(this.$tag_rules[$tag_name]['after_endtag']);
        } else {
            this.cleanupWSByEatingInput(null);
        }
        if (this.$debug) {
            Debugger.debug("Internal_ParseEndTagToken:", `end tag [/${$tag_name}] done; push output: ${$output}`);
        }
        this.$stack.push({
            [BBStack.TOKEN]: BBToken.TEXT,
            [BBStack.TEXT]: $output,
            [BBStack.TAG]: false,
            [BBStack.CLASS]: this.$current_class,
        });
    }
    /**
     * Parse a BBCode string and convert it into HTML.
     *
     * Core parser.  This is where all the magic begins and ends.
     * Core parsing routine.  Call with a BBCode string, and it returns an HTML string.
     *
     * @param string $string The BBCode string to parse.
     * @return string Returns the HTML version of {@link $string}.
     */
    public parse($string: string): string {
        if (!$string) return undefined;
        if (this.$debug) {
            Debugger.debug("Parse Begin:", `input string is ${$string.length} characters long:"`);
            Debugger.debug("Parse:", `input: ${$string}`);
        }
        // The lexer is responsible for converting individual characters to tokens,
        // and uses preg_split to do most of its magic.  Because it uses preg_split
        // and not a character-by-character tokenizer, the structure of the input
        // must be known in advance, which is why the tag marker cannot be changed
        // during the parse.
        this.$lexer = new BBCodeLexer($string, this.$tag_marker);
        this.$lexer.$debug = this.$debug;
        // If we're fuzzily limiting the text length, see if we need to actually
        // cut it off, or if it's close enough to not be worth the effort.
        const $old_output_limit = this.$output_limit;
        let $result;
        if (this.$output_limit > 0) {
            if (this.$debug)
                Debugger.debug("Parse:", `Limiting text length to ${this.$output_limit}.`);
            if ($string.length < this.$output_limit) {
                // Easy case:  A short string can't possibly be longer than the output
                // limit, so just turn off the output limit.
                this.$output_limit = 0;
                if (this.$debug)
                    Debugger.debug("Parse:", "Not bothering to limit: Text is too short already.");
            } else if (this.$limit_precision > 0) {
                // We're using fuzzy precision, so make a guess as to how long the text is,
                // and then decide whether we can let this string slide through based on the
                // limit precision.
                const $guess_length = this.$lexer.guessTextLength();
                if (this.$debug)
                    Debugger.debug("Parse:", `Maybe not: Fuzzy limiting enabled, and approximate text length is ${$guess_length}.`);
                if ($guess_length < this.$output_limit * (this.$limit_precision + 1.0)) {
                    if (this.$debug)
                        Debugger.debug("Parse:", "Not limiting text; it's close enough to the limit to be acceptable.");
                    this.$output_limit = 0;
                } else {
                    if (this.$debug)
                        Debugger.debug("Parse:", "Limiting text; it's definitely too long.");
                }
            }
        }
        // The token stack is used to perform a document-tree walk without actually
        // building the document tree, and is an essential component of our input-
        // validation algorithm.
        this.$stack = [];
        // There are no start tags (yet).
        this.$start_tags = [];
        // There are no unmatched start tags (yet).
        this.$lost_start_tags = [];
        // There is no text yet.
        this.$text_length = 0;
        this.$was_limited = false;
        // Remove any initial whitespace in pre-trim mode.
        if (this.$pre_trim.length > 0)
            this.cleanupWSByEatingInput(this.$pre_trim);
        // In plain mode, we generate newlines instead of <br> tags.
        const $newline = this.$plain_mode ? "\n" : "<br>\n";
        // This is a fairly straightforward push-down automaton operating in LL(1) mode.  For
        // clarity's sake, we break the tag-processing code into separate functions, but we
        // keep the text/whitespace/newline code here for performance reasons.
        while (true) {
            let $token_type;
            if (($token_type = this.$lexer.nextToken()) == BBToken.EOI) {
                break;
            }
            if (this.$debug)
                Debugger.debug("Parse: Stack contents:", this.dumpStack());
            switch ($token_type) {
            case BBToken.TEXT:
                // Text is like an arithmetic operand, so just push it onto the stack because we
                // won't know what to do with it until we reach an operator (e.g., a tag or EOI).
                if (this.$debug) {
                    Debugger.debug("Internal_ParseTextToken:", `fixup and push text: ${this.$lexer.$text}`);
                }
                // If this token pushes us past the output limit, split it up on a whitespace
                // boundary, add as much as we can, and then abort.
                if (this.$output_limit > 0 && this.$text_length + this.$lexer.$text.length >= this.$output_limit) {
                    const $text = this.limitText(this.$lexer.$text, this.$output_limit - this.$text_length);
                    if ($text.length > 0) {
                        this.$text_length += $text.length;
                        this.$stack.push({
                            [BBStack.TOKEN]: BBToken.TEXT,
                            [BBStack.TEXT]: this.fixupOutput($text),
                            [BBStack.TAG]: false,
                            [BBStack.CLASS]: this.$current_class,
                        });
                    }
                    this.doLimit();
                    break;
                }
                this.$text_length += this.$lexer.$text.length;
                // Push this text token onto the stack.
                this.$stack.push({
                    [BBStack.TOKEN]: BBToken.TEXT,
                    [BBStack.TEXT]: this.fixupOutput(this.$lexer.$text),
                    [BBStack.TAG]: false,
                    [BBStack.CLASS]: this.$current_class,
                });
                break;
            case BBToken.WS:
                // Whitespace is like an operand too, so just push it onto the stack, but
                // sanitize it by removing all non-tab non-space characters.
                if (this.$debug)
                    Debugger.debug("Internal_ParseWhitespaceToken:", "fixup and push whitespace");
                    // If this token pushes us past the output limit, don't process anything further.
                if (this.$output_limit > 0 && this.$text_length + this.$lexer.$text.length >= this.$output_limit) {
                    this.doLimit();
                    break;
                }
                this.$text_length += this.$lexer.$text.length;
                // Push this whitespace onto the stack.
                this.$stack.push({
                    [BBStack.TOKEN]: BBToken.WS,
                    [BBStack.TEXT]: this.$lexer.$text,
                    [BBStack.TAG]: false,
                    [BBStack.CLASS]: this.$current_class,
                });
                break;
            case BBToken.NL:
                // Newlines are really like tags in disguise:  They insert a replaced
                // element into the output, and are actually more-or-less like plain text.
                if (this.$debug)
                    Debugger.debug("Internal_ParseNewlineToken:", "got a newline.");
                if (this.$ignore_newlines) {
                    if (this.$debug)
                        Debugger.debug("Internal_ParseNewlineToken:", "push newline as whitespace.");
                        // If this token pushes us past the output limit, don't process anything further.
                    if (this.$output_limit > 0 && this.$text_length + 1 >= this.$output_limit) {
                        this.doLimit();
                        break;
                    }
                    this.$text_length += 1;
                    // In $ignore_newlines mode, we simply push the newline as whitespace.
                    // Note that this can yield output that's slightly different than the
                    // input:  For example, a "\r\n" input will produce a "\n" output; but
                    // this should still be acceptable, since we're working with text, not
                    // binary data.
                    this.$stack.push({
                        [BBStack.TOKEN]: BBToken.WS,
                        [BBStack.TEXT]: "\n",
                        [BBStack.TAG]: false,
                        [BBStack.CLASS]: this.$current_class,
                    });
                } else {
                    // Any whitespace before a newline isn't worth outputting, so if there's
                    // whitespace sitting on top of the stack, remove it so that it doesn't
                    // get outputted.
                    this.cleanupWSByPoppingStack("s", this.$stack);
                    if (this.$debug)
                        Debugger.debug("Internal_ParseNewlineToken:", "push newline.");
                        // If this token pushes us past the output limit, don't process anything further.
                    if (this.$output_limit > 0 && this.$text_length + 1 >= this.$output_limit) {
                        this.doLimit();
                        break;
                    }
                    this.$text_length += 1;
                    // Add the newline to the stack.
                    this.$stack.push({
                        [BBStack.TOKEN]: BBToken.NL,
                        [BBStack.TEXT]: $newline,
                        [BBStack.TAG]: false,
                        [BBStack.CLASS]: this.$current_class,
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
        if (this.$debug)
            Debugger.debug("Parse Done:", "done main parse; packing stack as text string.");
        // Remove any trailing whitespace in post-trim mode.
        if (this.$post_trim.length > 0)
            this.cleanupWSByPoppingStack(this.$post_trim, this.$stack);
        // Everything left on the stack should be HTML (or broken tags), so pop it
        // all off as plain text, concatenate it, and return it.
        $result = this.generateOutput(0);
        $result = this.collectTextReverse($result, $result.length - 1);
        // If we changed the limit (in fuzzy-limit mode), set it back.
        this.$output_limit = $old_output_limit;
        // In plain mode, we do just a *little* more cleanup on the whitespace to shorten
        // the output as much as possible.
        if (this.$plain_mode) {
            // Turn all non-newline whitespace characters into single spaces.
            $result = preg_replace("/[\\x00-\\x09\\x0B-\\x20]+/", " ", $result);
            // Turn multiple newlines into at most two newlines.
            $result = preg_replace("/(?:[\\x20]*\\n){2,}[\\x20]*/", "\n\n", $result);
            // Strip off all surrounding whitespace.
            $result = $result.trim();
        }
        if (this.$debug) {
            Debugger.debug("Parse: return:", `${$result}\n\n`);
        }
        return $result;
    }
}