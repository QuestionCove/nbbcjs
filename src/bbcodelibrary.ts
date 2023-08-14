import BBCode from "./bbcode";
import Debugger from "./debugger";

//Types
import { BBMode, BBType, BBAction } from '../@types/enums';
import { TagRules, TagType } from "../@types/dataTypes";

//PHP Functions
//TODO: Replace all PHP methods with native JavaScript
import parse_url from "locutus/php/url/parse_url";
import empty from "locutus/php/var/empty";
import preg_replace from "locutus/php/pcre/preg_replace";
import ltrim from "locutus/php/strings/ltrim";
import htmlspecialchars from "locutus/php/strings/htmlspecialchars";
import strip_tags from "locutus/php/strings/strip_tags";
import pathinfo from "locutus/php/filesystem/pathinfo";
import basename from "locutus/php/filesystem/basename";

export default class BBCodeLibrary {
    /**
     * @var defaultEmoji Standard library of smiley definitions.
     */
    public defaultEmoji: Record<string, string> = {
        ":)": "smile.gif",
        ":-)": "smile.gif",
        "=)": "smile.gif",
        "=-)": "smile.gif",
        ":(": "frown.gif",
        ":-(": "frown.gif",
        "=(": "frown.gif",
        "=-(": "frown.gif",
        ":D": "bigsmile.gif",
        ":-D": "bigsmile.gif",
        "=D": "bigsmile.gif",
        "=-D": "bigsmile.gif",
        ">:(": "angry.gif",
        ">:-(": "angry.gif",
        ">=(": "angry.gif",
        ">=-(": "angry.gif",
        "D:": "angry.gif",
        "D-:": "angry.gif",
        "D=": "angry.gif",
        "D-=": "angry.gif",
        ">:)": "evil.gif",
        ">:-)": "evil.gif",
        ">=)": "evil.gif",
        ">=-)": "evil.gif",
        ">:D": "evil.gif",
        ">:-D": "evil.gif",
        ">=D": "evil.gif",
        ">=-D": "evil.gif",
        ">;)": "sneaky.gif",
        ">;-)": "sneaky.gif",
        ">;D": "sneaky.gif",
        ">;-D": "sneaky.gif",
        "O:)": "saint.gif",
        "O:-)": "saint.gif",
        "O=)": "saint.gif",
        "O=-)": "saint.gif",
        ":O": "surprise.gif",
        ":-O": "surprise.gif",
        "=O": "surprise.gif",
        "=-O": "surprise.gif",
        ":?": "confuse.gif",
        ":-?": "confuse.gif",
        "=?": "confuse.gif",
        "=-?": "confuse.gif",
        ":s": "worry.gif",
        ":-S": "worry.gif",
        "=s": "worry.gif",
        "=-S": "worry.gif",
        ":|": "neutral.gif",
        ":-|": "neutral.gif",
        "=|": "neutral.gif",
        "=-|": "neutral.gif",
        ":I": "neutral.gif",
        ":-I": "neutral.gif",
        "=I": "neutral.gif",
        "=-I": "neutral.gif",
        ":/": "irritated.gif",
        ":-/": "irritated.gif",
        "=/": "irritated.gif",
        "=-/": "irritated.gif",
        ":\\": "irritated.gif",
        ":-\\": "irritated.gif",
        "=\\": "irritated.gif",
        "=-\\": "irritated.gif",
        ":P": "tongue.gif",
        ":-P": "tongue.gif",
        "=P": "tongue.gif",
        "=-P": "tongue.gif",
        "X-P": "tongue.gif",
        "8)": "bigeyes.gif",
        "8-)": "bigeyes.gif",
        "B)": "cool.gif",
        "B-)": "cool.gif",
        ";)": "wink.gif",
        ";-)": "wink.gif",
        "^_^": "anime.gif",
        "^^;": "sweatdrop.gif",
        ">_>": "lookright.gif",
        ">.>": "lookright.gif",
        "<_<": "lookleft.gif",
        "<.<": "lookleft.gif",
        "XD": "laugh.gif",
        "X-D": "laugh.gif",
        ";D": "bigwink.gif",
        ";-D": "bigwink.gif",
        ":3": "smile3.gif",
        ":-3": "smile3.gif",
        "=3": "smile3.gif",
        "=-3": "smile3.gif",
        ";3": "wink3.gif",
        ";-3": "wink3.gif",
        "<g>": "teeth.gif",
        "<G>": "teeth.gif",
        "o.O": "boggle.gif",
        "O.o": "boggle.gif",
        ":blue:": "blue.gif",
        ":zzz:": "sleepy.gif",
        "<3": "heart.gif",
        ":star:": "star.gif"
    };
    /**
     * @var defaultTagRules {@link TagRules} Standard rules for what to do when a BBCode tag is encountered.
     */
    public defaultTagRules: Record<string, TagRules> = {
        "b": {
            "simple_start": "<b>",
            "simple_end": "</b>",
            "class": "inline",
            "allow_in": ["listitem", "block", "columns", "inline", "link"],
            "plain_start": "<b>",
            "plain_end": "</b>",
            "allow_params": false
        },
        "i": {
            "simple_start": "<i>",
            "simple_end": "</i>",
            "class": "inline",
            "allow_in": ["listitem", "block", "columns", "inline", "link"],
            "plain_start": "<i>",
            "plain_end": "</i>",
            "allow_params": false
        },
        "u": {
            "simple_start": "<u>",
            "simple_end": "</u>",
            "class": "inline",
            "allow_in": ["listitem", "block", "columns", "inline", "link"],
            "plain_start": "<u>",
            "plain_end": "</u>",
            "allow_params": false
        },
        "s": {
            "simple_start": "<strike>",
            "simple_end": "</strike>",
            "class": "inline",
            "allow_in": ["listitem", "block", "columns", "inline", "link"],
            "plain_start": "<i>",
            "plain_end": "</i>",
            "allow_params": false
        },
        "font": {
            "mode": BBMode.LIBRARY,
            "allow":
            {
                "_default": "/^[a-zA-Z0-9._ -]+$/"
            },
            "method": "doFont",
            "class": "inline",
            "allow_in": ["listitem", "block", "columns", "inline", "link"]
        },
        "color": {
            "mode": BBMode.ENHANCED,
            "allow":
            {
                "_default": "/^#?[a-zA-Z0-9._ -]+$/"
            },
            "template": "<span style=\"color:{$_default/tw}\">{$_content/v}</span>",
            "class": "inline",
            "allow_in": ["listitem", "block", "columns", "inline", "link"]
        },
        "size": {
            "mode": BBMode.LIBRARY,
            "allow":
            {
                "_default": "/^[0-9.]+$/"
            },
            "method": "doSize",
            "class": "inline",
            "allow_in": ["listitem", "block", "columns", "inline", "link"]
        },
        "sup": {
            "simple_start": "<sup>",
            "simple_end": "</sup>",
            "class": "inline",
            "allow_in": ["listitem", "block", "columns", "inline", "link"],
            "allow_params": false
        },
        "sub": {
            "simple_start": "<sub>",
            "simple_end": "</sub>",
            "class": "inline",
            "allow_in": ["listitem", "block", "columns", "inline", "link"],
            "allow_params": false
        },
        "spoiler": {
            "simple_start": "<span class=\"bbcode_spoiler\">",
            "simple_end": "</span>",
            "class": "inline",
            "allow_in": ["listitem", "block", "columns", "inline", "link"]
        },
        "acronym": {
            "mode": BBMode.ENHANCED,
            "template": "<span class=\"bbcode_acronym\" title=\"{$_default/e}\">{$_content/v}</span>",
            "class": "inline",
            "allow_in": ["listitem", "block", "columns", "inline", "link"]
        },
        "url": {
            "mode": BBMode.LIBRARY,
            "method": "doURL",
            "class": "link",
            "allow_in": ["listitem", "block", "columns", "inline"],
            "content": BBType.REQUIRED,
            "plain_start": "<a href=\"{$link}\">",
            "plain_end": "</a>",
            "plain_content": ["_content", "_default"],
            "plain_link": ["_default", "_content"]
        },
        "email": {
            "mode": BBMode.LIBRARY,
            "method": "doEmail",
            "class": "link",
            "allow_in": ["listitem", "block", "columns", "inline"],
            "content": BBType.REQUIRED,
            "plain_start": "<a href=\"mailto:{$link}\">",
            "plain_end": "</a>",
            "plain_content": ["_content", "_default"],
            "plain_link": ["_default", "_content"]
        },
        "wiki": {
            "mode": BBMode.LIBRARY,
            "method": "doWiki",
            "class": "link",
            "allow_in": ["listitem", "block", "columns", "inline"],
            "end_tag": BBType.PROHIBIT,
            "content": BBType.PROHIBIT,
            "plain_start": "<b>[",
            "plain_end": "]</b>",
            "plain_content": ["title", "_default"],
            "plain_link": ["_default", "_content"]
        },
        "img": {
            "mode": BBMode.LIBRARY,
            "method": "doImage",
            "class": "image",
            "allow_in": ["listitem", "block", "columns", "inline", "link"],
            "end_tag": BBType.REQUIRED,
            "content": BBType.OPTIONAL,
            "plain_start": "[image]",
            "plain_content": []
        },
        "rule": {
            "mode": BBMode.LIBRARY,
            "method": "doRule",
            "class": "block",
            "allow_in": ["listitem", "block", "columns"],
            "end_tag": BBType.PROHIBIT,
            "content": BBType.PROHIBIT,
            "before_tag": "sns",
            "after_tag": "sns",
            "plain_start": "\n-----\n",
            "plain_end": "",
            "plain_content": []
        },
        "br": {
            "mode": BBMode.SIMPLE,
            "simple_start": "<br>\n",
            "simple_end": "",
            "class": "inline",
            "allow_in": ["listitem", "block", "columns", "inline", "link"],
            "end_tag": BBType.PROHIBIT,
            "content": BBType.PROHIBIT,
            "before_tag": "s",
            "after_tag": "s",
            "plain_start": "\n",
            "plain_end": "",
            "plain_content": []
        },
        "left": {
            "simple_start": "\n<div class=\"bbcode_left\" style=\"text-align:left\">\n",
            "simple_end": "\n</div>\n",
            "allow_in": ["listitem", "block", "columns"],
            "before_tag": "sns",
            "after_tag": "sns",
            "before_endtag": "sns",
            "after_endtag": "sns",
            "plain_start": "\n",
            "plain_end": "\n"
        },
        "right": {
            "simple_start": "\n<div class=\"bbcode_right\" style=\"text-align:right\">\n",
            "simple_end": "\n</div>\n",
            "allow_in": ["listitem", "block", "columns"],
            "before_tag": "sns",
            "after_tag": "sns",
            "before_endtag": "sns",
            "after_endtag": "sns",
            "plain_start": "\n",
            "plain_end": "\n"
        },
        "center": {
            "simple_start": "\n<div class=\"bbcode_center\" style=\"text-align:center\">\n",
            "simple_end": "\n</div>\n",
            "allow_in": ["listitem", "block", "columns"],
            "before_tag": "sns",
            "after_tag": "sns",
            "before_endtag": "sns",
            "after_endtag": "sns",
            "plain_start": "\n",
            "plain_end": "\n"
        },
        "rtl": {
            "simple_start": "<div style=\"direction:rtl;\">",
            "simple_end": "</div>",
            "class": "inline",
            "allow_in": ["listitem", "block", "columns", "inline", "link"]
        },
        "indent": {
            "simple_start": "\n<div class=\"bbcode_indent\" style=\"margin-left:4em\">\n",
            "simple_end": "\n</div>\n",
            "allow_in": ["listitem", "block", "columns"],
            "before_tag": "sns",
            "after_tag": "sns",
            "before_endtag": "sns",
            "after_endtag": "sns",
            "plain_start": "\n",
            "plain_end": "\n"
        },
        "columns": {
            "simple_start": "\n<table class=\"bbcode_columns\"><tbody><tr><td class=\"bbcode_column bbcode_firstcolumn\">\n",
            "simple_end": "\n</td></tr></tbody></table>\n",
            "class": "columns",
            "allow_in": ["listitem", "block", "columns"],
            "end_tag": BBType.REQUIRED,
            "content": BBType.REQUIRED,
            "before_tag": "sns",
            "after_tag": "sns",
            "before_endtag": "sns",
            "after_endtag": "sns",
            "plain_start": "\n",
            "plain_end": "\n"
        },
        "nextcol": {
            "simple_start": "\n</td><td class=\"bbcode_column\">\n",
            "class": "nextcol",
            "allow_in": ["columns"],
            "end_tag": BBType.PROHIBIT,
            "content": BBType.PROHIBIT,
            "before_tag": "sns",
            "after_tag": "sns",
            "before_endtag": "sns",
            "after_endtag": "sns",
            "plain_start": "\n",
            "plain_end": ""
        },
        "code": {
            "mode": BBMode.ENHANCED,
            "template": "\n<div class=\"bbcode_code\">\n<div class=\"bbcode_code_head\">Code:</div>\n<div class=\"bbcode_code_body\" style=\"white-space:pre\">{$_content/v}</div>\n</div>\n",
            "class": "code",
            "allow_in": ["listitem", "block", "columns"],
            "content": BBType.VERBATIM,
            "before_tag": "sns",
            "after_tag": "sn",
            "before_endtag": "sn",
            "after_endtag": "sns",
            "plain_start": "\n<b>Code:</b>\n",
            "plain_end": "\n"
        },
        "quote": {
            "mode": BBMode.LIBRARY,
            "method": "doQuote",
            "allow_in": ["listitem", "block", "columns"],
            "before_tag": "sns",
            "after_tag": "sns",
            "before_endtag": "sns",
            "after_endtag": "sns",
            "plain_start": "\n<b>Quote:</b>\n",
            "plain_end": "\n"
        },
        "list": {
            "mode": BBMode.LIBRARY,
            "method": "doList",
            "class": "list",
            "allow_in": ["listitem", "block", "columns"],
            "before_tag": "sns",
            "after_tag": "sns",
            "before_endtag": "sns",
            "after_endtag": "sns",
            "plain_start": "\n",
            "plain_end": "\n"
        },
        "*": {
            "simple_start": "<li>",
            "simple_end": "</li>\n",
            "class": "listitem",
            "allow_in": ["list"],
            "end_tag": BBType.OPTIONAL,
            "before_tag": "s",
            "after_tag": "s",
            "before_endtag": "sns",
            "after_endtag": "sns",
            "plain_start": "\n * ",
            "plain_end": "\n"
        }
    };
    /**
     * @var array The file extensions that are considered valid local images.
     */
    protected imageExtensions = ['gif', 'jpg', 'jpeg', 'png', 'svg'];
    /**
     * Format a [url] tag by producing an <a>...</a> element.
     *
     * The URL only allows http, https, mailto, and ftp protocols for safety.
     *
     * @param bbcode: BBCode The {@link BBCode} object doing the parsing.
     * @param action The current action being performed on the tag.
     * @param name The name of the tag.
     * @param defaultValue The default value passed to the tag in the form: `[tag=default]`.
     * @param params All of the parameters passed to the tag.
     * @param content The content of the tag. Only available when {@link action} is {@link BBAction.OUTPUT}.
     * @return Returns the full HTML url.
     */
    public doURL(bbcode: BBCode, action: BBAction, name: string, defaultValue: string, params: boolean | TagType, content: string): string | true {
        // We can't check this with BBCODE_CHECK because we may have no URL
        // before the content has been processed.
        if (action == BBAction.CHECK) {
            return true;
        }
        let target = '';
        const url = typeof defaultValue == "string"
            ? defaultValue
            : bbcode.unHTMLEncode(strip_tags(content));
        if (bbcode.isValidURL(url)) {
            if (bbcode.debug) {
                Debugger.debug('ISVALIDURL', '');
            }
            if (bbcode.getURLTargetable() !== false && params['target']) {
                target = ' target="'+htmlspecialchars(params['target'])+'"';
            }
            if (bbcode.getURLTarget() !== false && empty(target)) {
                target = ' target="'+htmlspecialchars(bbcode.getURLTarget())+'"';
            }
            // If `detectURLs` is on, it's possble the content is already
            // enclosed in an <a href> tag. Remove that if that is the case.
            content = preg_replace('/^\\<a [^\\>]*\\>(.*?)<\\/a>$/', "\\1", content);
            return bbcode.fillTemplate(bbcode.getURLTemplate(), {"url": url, "target": target, "content": content});
        } else {
            return htmlspecialchars(params['_tag'])+content+htmlspecialchars(params['_endtag']);
        }
    }
    /**
     * Format an [email] tag by producing an <a href="mailto:..+">...</a> element.
     *
     * The e-mail address must be a valid address including at least a '@' and a valid domain
     * name or IPv4 or IPv6 address after the '@'.
     *
     * @param bbcode: BBCode The {@link BBCode} object doing the parsing.
     * @param action The current action being performed on the tag.
     * @param name The name of the tag.
     * @param defaultValue The default value passed to the tag in the form: `[tag=default]`.
     * @param params All of the parameters passed to the tag.
     * @param content The content of the tag. Only available when {@link action} is {@link BBAction.OUTPUT}.
     * @return string Returns the email link HTML.
     */
    public doEmail(bbcode: BBCode, action: BBAction, name: string, defaultValue: string, params: boolean | TagType, content: string): string | true {
        // We can't check this with BBCODE_CHECK because we may have no URL
        // before the content has been processed.
        if (action == BBAction.CHECK) {
            return true;
        }
        const email = typeof defaultValue == "string"
            ? defaultValue
            : bbcode.unHTMLEncode(strip_tags(content));
        if (bbcode.isValidEmail(email)) {
            return bbcode.fillTemplate(bbcode.getEmailTemplate(), {"email": email, "content": content});
        } else {
            return htmlspecialchars(params['_tag'])+content+htmlspecialchars(params['_endtag']);
        }
    }
    /**
     * Format a [size] tag by producing a <span> with a style with a different font-size.
     *
     * @param bbcode: BBCode The {@link BBCode} object doing the parsing.
     * @param action The current action being performed on the tag.
     * @param name The name of the tag.
     * @param defaultValue The default value passed to the tag in the form: `[tag=default]`.
     * @param params All of the parameters passed to the tag.
     * @param content The content of the tag. Only available when {@link action} is {@link BBAction.OUTPUT}.
     * @return Returns a span with the font size CSS.
     */
    public doSize(bbcode: BBCode, action: BBAction, name: string, defaultValue: string, params: boolean | TagType, content: string): string {
        let size: any;
        switch (defaultValue) {
        case '0':
            size = '.5em';
            break;
        case '1':
            size = '.67em';
            break;
        case '2':
            size = '.83em';
            break;
        case '3':
            size = '1.0em';
            break;
        case '4':
            size = '1.17em';
            break;
        case '5':
            size = '1.5em';
            break;
        case '6':
            size = '2.0em';
            break;
        case '7':
            size = '2.5em';
            break;
        default:
            size = parseInt(defaultValue);
            if (size < 11 || size > 48) {
                size = '1.0em';
            } else {
                size += 'px';
            }
            break;
        }
        return '<span style="font-size:'+size+'">'+content+'</span>';
    }
    /**
     * Format a [font] tag by producing a <span> with a style with a different font-family.
     *
     * This is complicated by the fact that we have to recognize the five special font
     * names and quote all the others.
     *
     * @param bbcode: BBCode The {@link BBCode} object doing the parsing.
     * @param action The current action being performed on the tag.
     * @param name The name of the tag.
     * @param defaultValue The default value passed to the tag in the form: `[tag=default]`.
     * @param params All of the parameters passed to the tag.
     * @param content The content of the tag. Only available when {@link action} is {@link BBAction.OUTPUT}.
     * @return Returns a span with the font family CSS.
     */
    public doFont(bbcode: BBCode, action: BBAction, name: string, defaultValue: string, params: boolean | TagType, content: string): string {
        const fonts = defaultValue.split(',');
        let result = "";
        const specialFonts: Record<string, string> = {
            "serif": "serif",
            "sans-serif": "sans-serif",
            "sans serif": "sans-serif",
            "sansserif": "sans-serif",
            "sans": "sans-serif",
            "cursive": "cursive",
            "fantasy": "fantasy",
            "monospace": "monospace",
            "mono": "monospace"
        };
        for (let font of fonts) {
            font = font.trim();
            if (specialFonts[font]) {
                if (result.length > 0) {
                    result += ",";
                }
                result += specialFonts[font];
            } else if (font.length > 0) {
                if (result.length > 0) {
                    result += ",";
                }
                result += `'${font}'`;
            }
        }
        return `<span style="font-family:${result}">${content}</span>`;
    }
    /**
     * Format a [wiki] tag by producing an <a>...</a> element.
     *
     * @param bbcode: BBCode The {@link BBCode} object doing the parsing.
     * @param action The current action being performed on the tag.
     * @param name The name of the tag.
     * @param defaultValue The default value passed to the tag in the form: `[tag=default]`.
     * @param params All of the parameters passed to the tag.
     * @param content The content of the tag. Only available when {@link action} is {@link BBAction.OUTPUT}.
     * @return Returns a link to the wiki.
     */
    public doWiki(bbcode: BBCode, action: BBAction, name: string, defaultValue: string, params: boolean | TagType, content: string): string | boolean {
        let title;
        name = bbcode.wikify(defaultValue);
        if (action == BBAction.CHECK) {
            return name.length > 0;
        }
        if (params['title'] && params['title'].length) {
            title = params['title'].trim();
        } else {
            title = defaultValue.trim();
        }
        const wikiURL = bbcode.getWikiURL();
        return bbcode.fillTemplate(bbcode.getWikiURLTemplate(), {wikiURL: wikiURL, name: name, title: title});
    }
    /**
     * Format an [img] tag.  The URL only allows http, https, and ftp protocols for safety.
     *
     * @param bbcode: BBCode The {@link BBCode} object doing the parsing.
     * @param action The current action being performed on the tag.
     * @param name The name of the tag.
     * @param defaultValue The default value passed to the tag in the form: `[tag=default]`.
     * @param params All of the parameters passed to the tag.
     * @param content The content of the tag. Only available when {@link action} is {@link BBAction.OUTPUT}.
     * @return Returns the image tag.
     */
    public doImage(bbcode: BBCode, action: BBAction, name: string, defaultValue: string, params: boolean | TagType, content: string): string | true {
        // We can't validate this until we have its content.
        if (action == BBAction.CHECK) {
            return true;
        }
        content = bbcode.unHTMLEncode(strip_tags(content)).trim();
        if (empty(content) && defaultValue) {
            content = defaultValue;
        }
        const urlParts = parse_url(content) as Record<string, string>;
        if (typeof urlParts == "object") {
            if (urlParts['path'] &&
               !urlParts['scheme'] &&
               !/^.{0,2}\//.test(urlParts['path']) &&
               this.imageExtensions.includes(pathinfo(urlParts['path'], 'PATHINFO_EXTENSION'))
            ) {
                const localImgURL = bbcode.getLocalImgURL();
                return "<img src=\""
                +htmlspecialchars((empty(localImgURL) ? '' : localImgURL+'/')+ltrim(urlParts['path'], '/'))+'" alt="'
                +htmlspecialchars(basename(content))+'" class="bbcode_img" />';
            } else if (bbcode.isValidURL(content, false)) {
                // Remote URL, or at least we don't know where it is.
                return '<img src="'+htmlspecialchars(content)+'" alt="'
                +htmlspecialchars(basename(content))+'" class="bbcode_img" />';
            }
        }
        return htmlspecialchars(params['_tag'])+htmlspecialchars(content)+htmlspecialchars(params['_endtag']);
    }
    /**
     * Format a [rule] tag.
     *
     * This substitutes the content provided by the BBCode object, whatever that may be.
     *
     * @param bbcode: BBCode The {@link BBCode} object doing the parsing.
     * @param action The current action being performed on the tag.
     * @param name The name of the tag.
     * @param defaultValue The default value passed to the tag in the form: `[tag=default]`.
     * @param params All of the parameters passed to the tag.
     * @param content The content of the tag. Only available when {@link action} is {@link BBAction.OUTPUT}.
     * @return Returns the rule HTML or **true** if {@link action} is **BBAction.BBCODE_CHECK**.
     */
    public doRule(bbcode: BBCode, action: BBAction, name: string, defaultValue: string, params: boolean | TagType, content: string): boolean | string {
        if (action == BBAction.CHECK) {
            return true;
        } else {
            return bbcode.getRuleHTML();
        }
    }
    /**
     * Format a [quote] tag.
     *
     * This tag can come in a variety of flavors:
     *
     * ```
     * [quote]...[/quote]
     * [quote=Tom]...[/quote]
     * [quote name="Tom"]...[/quote]
     * ```
     *
     * In the third form, you can also add a date="" parameter to display the date
     * on which Tom wrote it, and you can add a url="" parameter to turn the author's
     * name into a link.  A full example might be:
     *
     * ```
     * [quote name="Tom" date="July 4, 1776 3:48 PM" url="http://www.constitution.gov"]...[/quote]
     * ```
     *
     * The URL only allows http, https, mailto, gopher, ftp, and feed protocols for safety.
     *
     * @param bbcode: BBCode The {@link BBCode} object doing the parsing.
     * @param action The current action being performed on the tag.
     * @param name The name of the tag.
     * @param defaultValue The default value passed to the tag in the form: `[tag=default]`.
     * @param params All of the parameters passed to the tag.
     * @param content The content of the tag. Only available when {@link action} is {@link BBAction.OUTPUT}.
     * @return Returns the quote HTML or **true** if {@link action} is **BBAction.BBCODE_CHECK**.
     */
    public doQuote(bbcode: BBCode, action: BBAction, name: string, defaultValue: string, params: boolean | TagType, content: string): boolean | string {
        if (action == BBAction.CHECK) {
            return true;
        }
        let title;
        if (params['name']) {
            title = htmlspecialchars(params['name'].trim())+" wrote";
            if (params['date']) {
                title += " on "+htmlspecialchars(params['date'].trim());
            }
            title += ":";
            if (params['url']) {
                const URL = params['url'].trim();
                if (bbcode.isValidURL(URL)) {
                    title = "<a href=\""+htmlspecialchars(params['url'])+"\">"+title+"</a>";
                }
            }
        } else if (typeof defaultValue !== "string") {
            title = "Quote:";
        } else {
            title = htmlspecialchars(defaultValue.trim())+" wrote:";
        }
        return bbcode.fillTemplate(bbcode.getQuoteTemplate(), {"title": title, "content": content});
    }
    /**
     * Format a [list] tag.
     *
     * This  is complicated by the number of different
     * ways a list can be started.  The following parameters are allowed:
     *
     * ```
     * [list]           Unordered list, using default marker
     * [list=circle]    Unordered list, using circle marker
     * [list=disc]      Unordered list, using disc marker
     * [list=square]    Unordered list, using square marker
     *
     * [list=1]         Ordered list, numeric, starting at 1
     * [list=A]         Ordered list, capital letters, starting at A
     * [list=a]         Ordered list, lowercase letters, starting at a
     * [list=I]         Ordered list, capital Roman numerals, starting at I
     * [list=i]         Ordered list, lowercase Roman numerals, starting at i
     * [list=greek]     Ordered list, lowercase Greek letters, starting at alpha
     * [list=01]        Ordered list, two-digit numeric with 0-padding, starting at 01
     * ```
     *
     * @param bbcode: BBCode The {@link BBCode} object doing the parsing.
     * @param action The current action being performed on the tag.
     * @param name The name of the tag.
     * @param defaultValue The default value passed to the tag in the form: `[tag=default]`.
     * @param params All of the parameters passed to the tag.
     * @param content The content of the tag. Only available when {@link action} is {@link BBAction.OUTPUT}.
     * @return Returns the list HTML or a boolen result when {@link action} is **BBAction.BBCODE_CHECK**.
     */
    public doList(bbcode: BBCode, action: BBAction, name: string, defaultValue: string|null, params: boolean | TagType, content: string): boolean | string {
        // Allowed list styles, striaght from the CSS 2.1 spec.  The only prohibited
        // list style is that with image-based markers, which often slows down web sites.
        const listStyles: Record<string, string> = {
            "1": "decimal",
            "01": "decimal-leading-zero",
            "i": "lower-roman",
            "I": "upper-roman",
            "a": "lower-alpha",
            "A": "upper-alpha"
        };
        const ciListStyles: Record<string, string> = {
            "circle": "circle",
            "disc": "disc",
            "square": "square",
            "greek": "lower-greek",
            "armenian": "armenian",
            "georgian": "georgian"
        };
        const ulTypes: Record<string, string> = {
            "circle": "circle",
            "disc": "disc",
            "square": "square"
        };
        defaultValue = defaultValue ? defaultValue.trim() : null;
        if (action == BBAction.CHECK) {
            if (!(typeof defaultValue == "string")) {
                return true;
            } else if (listStyles[defaultValue]) {
                return true;
            } else if (ciListStyles[defaultValue.toLowerCase()]) {
                return true;
            } else {
                return false;
            }
        }
        // Choose a list element (<ul> or <ol>) and a style.
        let elem: string, type: string;
        if (!(typeof defaultValue == "string")) {
            elem = 'ul';
            type = '';
        } else if (defaultValue == '1') {
            elem = 'ol';
            type = '';
        } else if (listStyles[defaultValue]) {
            elem = 'ol';
            type = listStyles[defaultValue];
        } else {
            defaultValue = defaultValue.toLowerCase();
            if (ulTypes[defaultValue]) {
                elem = 'ul';
                type = ulTypes[defaultValue];
            } else if (ciListStyles[defaultValue]) {
                elem = 'ol';
                type = ciListStyles[defaultValue];
            } else {
                elem = 'ul';
                type = '';
            }
        }
        // Generate the HTML for it.
        if (type.length > 0) {
            return `\n<${elem} class="bbcode_list" style="list-style-type:${type}">\n${content}</${elem}>\n`;
        } else {
            return `\n<${elem} class="bbcode_list">\n${content}</${elem}>\n`;
        }
    }
}