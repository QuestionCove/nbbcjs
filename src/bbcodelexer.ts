import Debugger from "./debugger";

//Types
import { BBToken, LexState } from '../@types/enums';
import { Param, State, TagType } from "../@types/dataTypes";

//Modules
import preg_split, {PREG_SPLIT_DELIM_CAPTURE, PREG_SPLIT_NO_EMPTY} from "../modules/preg_split";

export default class BBCodeLexer {
    public token: BBToken;         // Return token type:  One of the BBCODE_* constants.
    public text: string;           // Actual exact, original text of token.
    public tag: TagType | boolean; // If token is a tag, this is the decoded array version.
    public state: LexState;        // Next state of the lexer's state machine: text, or tag/ws/nl
    public input: string[];        // The input string, split into an array of tokens.
    public ptr: number;            // Read pointer into the input array.
    public unget: boolean;         // Whether to "unget" the last token.
    public verbatim: boolean;      // In verbatim mode, we return all input, unparsed, including comments.
    public debug: boolean;         // In debug mode, we dump decoded tags when we find them.
    public tagMarker: string;      // Which kind of tag marker we're using:  "[", "<", "(", or "{"
    public endTagMarker: string;   // The ending tag marker:  "]", ">", "(", or "{"
    public patMain: string|RegExp; // Main tag-matching pattern.
    public patComment: RegExp;     // Pattern for matching comments.
    public patComment2: RegExp;    // Pattern for matching comments.
    public patWiki: RegExp;        // Pattern for matching wiki-links.
    /**
     * Instantiate a new instance of the {@link BBCodeLexer} class.
     *
     * @param string The string to be broken up into tokens.
     * @param tagMarker The BBCode tag marker.
     */
    public constructor(string: string, tagMarker = '[', debug: boolean = false) {
        // First thing we do is to split the input string into tuples of
        // text and tags.  This will make it easy to tokenize.  We define a tag as
        // anything starting with a [, ending with a ], and containing no [ or ] in
        // between unless surrounded by "" or '', and containing no newlines.
        // We also separate out whitespace and newlines.
        // Choose a tag marker based on the possible tag markers.
        const regexBeginMarkers: Record<string, string> = {
            "[": "\\[",
            "<": "<",
            "{": "\\{",
            "(": "\\("
        };
        const regexEndMarkers: Record<string, string> = {
            "[": "\\]",
            "<": ">",
            "{": "\\}",
            "(": "\\)"
        };
        const endMarkers: Record<string, string> = {
            "[": "]",
            "<": ">",
            "{": "}",
            "(": ")"
        };
        if (!regexEndMarkers[tagMarker]) {
            tagMarker = '[';
        }
        const end = regexEndMarkers[tagMarker];
        const start = regexBeginMarkers[tagMarker];
        this.tagMarker = tagMarker;
        this.endTagMarker = endMarkers[tagMarker];
        // this.input will be an array of tokens, with the special property that
        // the elements strictly alternate between plain text and tags/whitespace/newlines,
        // and that tags always have *two* entries per tag. The first element will
        // always be plain text. Note that the regexes below make VERY heavy use of
        // PCRE regex-syntax extensions, so don't even try to modify them unless you
        // know how things like (?!) and (?:) and (?=) work. Unfortanetly the /x modifier
        // doesn't exist here to make this a *lot* more legible and debuggable, so it's
        // been modified to stretch across multiple lines with the comments edited.
        this.patMain = "/("
            // Match tags, as long as they do not start with [-- or [' or [!-- or [rem or [[.
            // Tags may contain "quoted" or 'quoted' sections that may contain [ or ] characters.
            // Tags may not contain newlines.
            +`${start}`
            +`(?!--|'|!--|${start}${start})`
            +`(?:[^\\n\\r${start}${end}]|\\"[^\\"\\n\\r]*\\"|\\'[^\\'\\n\\r]*\\')*`
            +`${end}`
            // Match wiki-links, which are of the form [[...]] or [[...|...]].  Unlike
            // tags, wiki-links treat " and ' marks as normal input characters; but they
            // still may not contain newlines.
            +`|${start}${start}(?:[^${end}\\r\\n]|${end}[^${end}\\r\\n]){1,256}${end}${end}`
            // Match single-line comments, which start with [-- or [' or [rem .
            +`|${start}(?:--|')(?:[^${end}\\n\\r]*)${end}`
            // Match multi-line comments, which start with [!-- and end with --] and contain
            // no --] in between.
            +`|${start}!--(?:[^-]|-[^-]|--[^${end}])*--${end}`
            // Match five or more hyphens as a special token, which gets returned as a [rule] tag.
            +"|-----+"
            // Match newlines, in all four possible forms.
            +"|\\x0D\\x0A|\\x0A\\x0D|\\x0D|\\x0A"
            // Match whitespace, but only if it butts up against a newline, rule, or
            // bracket on at least one end.
            +`|[\\x00-\\x09\\x0B-\\x0C\\x0E-\\x20]+(?=[\\x0D\\x0A${start}]|-----|$)`
            +`|(?<=[\\x0D\\x0A${end}]|-----|^)[\\x00-\\x09\\x0B-\\x0C\\x0E-\\x20]+`
            +")/Dx";
        this.input = preg_split(this.patMain, string, -1, PREG_SPLIT_DELIM_CAPTURE);
        // Patterns for matching specific types of tokens during lexing. (originally contained Dx flags)
        this.patComment = new RegExp(`^${start}(?:--|')`);
        this.patComment2 = new RegExp(`^${start}!--(?:[^-]|-[^-]|--[^${end}])*--${end}$`);
        this.patWiki = new RegExp(`^${start}${start}([^\\|]*)(?:\\|(.*))?${end}${end}$`);
        // Current lexing state.
        this.ptr = 0;
        this.unget = false;
        this.state = LexState.TEXT;
        this.verbatim = false;
        // Return values.
        this.token = BBToken.EOI;
        this.tag = false;
        this.text = "";
        this.debug = debug;
    }
    /**
     * Compute how many non-tag characters there are in the input, give or take a few.
     *
     * This is optimized for speed, not accuracy, so it'll get some stuff like
     * horizontal rules and weird whitespace characters wrong, but it's only supposed
     * to provide a rough quick guess, not a hard fact.
     *
     * @return Returns the approximate text length.
     */
    public guessTextLength(): number {
        let length = 0;
        let ptr = 0;
        let state = LexState.TEXT;
        // Loop until we find a valid (nonempty) token.
        while (ptr < this.input.length) {
            const text = this.input[ptr++];
            if (state === LexState.TEXT) {
                state = LexState.TAG;
                length += text.length;
            } else {
                switch (this.text.slice(0, 1).charCodeAt(0)) {
                case 10:
                case 13:
                    state = LexState.TEXT;
                    length++;
                    break;
                default:
                    state = LexState.TEXT;
                    length += text.length;
                    break;
                case 40:
                case 60:
                case 91:
                case 123:
                    state = LexState.TEXT;
                    break;
                }
            }
        }
        return length;
    }
    /**
     * Return the type of the next token, either BBCODE_TAG or BBCODE_TEXT or BBCODE_EOI.
     *
     * This stores the content of this token into this.text, the type of this token in this.token, and possibly an
     * array into this.tag.
     *
     * If this is a BBCODE_TAG token, this.tag will be an array computed from the tag's contents, like this:
     *
     * ```
     * [
     *     '_name': tag_name,
     *     '_end': true if this is an end tag (i.e., the name starts with a /)
     *     '_default': default value (for example, in [url=foo], this is "foo").
     *     ...
     *     ...all other key: value parameters given in the tag...
     *     ...
     * ]
     * ```
     */
    public nextToken(): BBToken {
        // Handle ungets; if the last token has been "ungotten", just return it again.
        if (this.unget) {
            this.unget = false;
            return this.token;
        }
        // Loop until we find a valid (nonempty) token.
        while (true) {
            // Did we run out of tokens in the input?
            if (this.ptr >= this.input.length) {
                this.text = "";
                this.tag = false;
                return this.token = BBToken.EOI;
            }
            // Inhale one token, sanitizing away any weird control characters.  We
            // allow \t, \r, and \n to pass through, but that's it.
            this.text = this.input[this.ptr++].replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, "");
            if (this.verbatim) {
                // In verbatim mode, we return *everything* as plain text or whitespace.
                this.tag = false;
                let tokenType: BBToken;
                if (this.state === LexState.TEXT) {
                    this.state = LexState.TAG;
                    tokenType = BBToken.TEXT;
                } else {
                    // This must be either whitespace, a newline, or a tag.
                    this.state = LexState.TEXT;
                    switch (this.text.slice(0, 1).charCodeAt(0)) {
                    case 10:
                    case 13:
                        // Newline.
                        tokenType = BBToken.NL;
                        break;
                    default:
                        // Whitespace.
                        tokenType = BBToken.WS;
                        break;
                    case 45:
                    case 40:
                    case 60:
                    case 91:
                    case 123:
                        // Tag or comment.
                        tokenType = BBToken.TEXT;
                        break;
                    }
                }
                if (this.text.length > 0) {
                    return this.token = tokenType;
                }
            } else if (this.state === LexState.TEXT) {
                // Next up is plain text, but only return it if it's nonempty.
                this.state = LexState.TAG;
                this.tag = false;
                if (this.text.length > 0) {
                    return this.token = BBToken.TEXT;
                }
            } else {
                let matches;
                // This must be either whitespace, a newline, or a tag.
                switch (this.text.slice(0, 1).charCodeAt(0)) {
                case 10:
                case 13:
                    // Newline.
                    this.tag = false;
                    this.state = LexState.TEXT;
                    return this.token = BBToken.NL;
                case 45:
                    // A rule made of hyphens; return it as a [rule] tag.
                    if (/^-----/.test(this.text)) {
                        this.tag = {
                            "_name": "rule",
                            "_endtag": false,
                            "_default": ""
                        };
                        this.state = LexState.TEXT;
                        return this.token = BBToken.TAG;
                    } else {
                        this.tag = false;
                        this.state = LexState.TEXT;
                        if (this.text.length > 0) {
                            return this.token = BBToken.TEXT;
                        }
                        break;
                    }
                    break;
                default:
                    // Whitespace.
                    this.tag = false;
                    this.state = LexState.TEXT;
                    return this.token = BBToken.WS;
                case 40:
                case 60:
                case 91:
                case 123:
                    // Tag or comment.  This is the most complicated one, because it
                    // needs to be parsed into its component pieces.
                    // See if this is a comment; if so, skip it.
                    if (this.patComment.test(this.text)) {
                        // This is a comment, not a tag, so treat it like it doesn't exist.
                        this.state = LexState.TEXT;
                        break;
                    }
                    if (this.patComment2.test(this.text)) {
                        // This is a comment, not a tag, so treat it like it doesn't exist.
                        this.state = LexState.TEXT;
                        break;
                    }
                    // See if this is a [[wiki link]]; if so, convert it into a [wiki="" title=""] tag.
                    if ((matches = this.text.match(this.patWiki))) {
                        matches = {...{1: undefined, 2: undefined}, ...matches};
                        this.tag = {
                            '_name': 'wiki',
                            '_endtag': false,
                            '_default': matches[1], 
                            'title': matches[2]
                        };
                        this.state = LexState.TEXT;
                        return this.token = BBToken.TAG;
                    }
                    // Not a comment, so parse it like a tag.
                    this.tag = this.decodeTag(this.text);
                    this.state = LexState.TEXT;
                    return this.token = (this.tag['_end'] ? BBToken.ENDTAG : BBToken.TAG);
                }
            }
        }
    }
    /**
     * Un-gets the last token read so that a subsequent call to NextToken() will return it.
     *
     * Note that ungetToken() does not switch states when you switch between verbatim mode and standard mode:  For
     * example, if you read a tag, unget the tag, switch to verbatim mode, and then get the next token, you'll get back
     * a BBCODE_TAG --- exactly what you ungot, not a BBCODE_TEXT token.
     */
    public ungetToken() {
        if (this.token !== BBToken.EOI) {
            this.unget = true;
        }
    }
    /**
     * Peek at the next token, but don't remove it.
     */
    public peekToken() {
        const result = this.nextToken();
        if (this.token !== BBToken.EOI) {
            this.unget = true;
        }
        return result;
    }
    /**
     * Save the state of this lexer so it can be restored later.
     *
     * The return value from this should be considered opaque.  Because PHP uses copy-on-write references, the total
     * cost of the returned state is relatively small, and the running time of this function (and RestoreState) is very
     * fast.
     */
    public saveState(): State {
        return {
            'token': this.token,
            'text': this.text,
            'tag': this.tag,
            'state': this.state,
            'input': this.input,
            'ptr': this.ptr,
            'unget': this.unget,
            'verbatim': this.verbatim
        };
    }
    /**
     * Restore the state of this lexer from a saved previous state.
     *
     * @param lexState The previous lexer state.
     */
    public restoreState(lexState: State) {
        if (!(typeof lexState === "object")) {
            return;
        }
        lexState = {...{
            'token': undefined,
            'text': undefined,
            'tag': undefined,
            'state': undefined,
            'input': undefined,
            'ptr': undefined,
            'unget': undefined,
            'verbatim': undefined
        }, ...lexState};
        this.token = lexState['token'];
        this.text = lexState['text'];
        this.tag = lexState['tag'];
        this.state = lexState['state'];
        this.input = lexState['input'];
        this.ptr = lexState['ptr'];
        this.unget = lexState['unget'];
        this.verbatim = lexState['verbatim'];
    }
    /**
     * Given a string, if it's surrounded by "quotes" or 'quotes', remove them.
     *
     * @param string The string to strip.
     * @return Returns the string stripped of quotes.
     */
    protected stripQuotes(string: string): string {
        if (string.length > 1) {
            const first = string.slice(0, 1);
            const last = string.slice(-1);
            if (first === last && (first === '"' || first === "'")) {
                return string.slice(1, -1);
            }
        }
        return string;
    }
    /**
     * Given a tokenized piece of a tag, decide what type of token it is.
     *
     * Our return values are:
     *
     * - -1    End-of-input (EOI).
     * - '='   Token is an = sign.
     * - ' '   Token is whitespace.
     * - '"'   Token is quoted text.
     * - 'A'   Token is unquoted text.
     *
     * @param ptr The index of {@link pieces} to examine.
     * @param pieces The pieces array to classify.
     * @return Returns the tokenized piece of the tag.
     */
    protected classifyPiece(ptr: number, pieces: string[]) {
        if (ptr >= pieces.length) {
            return -1; // EOI.
        }
        const piece = pieces[ptr];
        if (piece === '=') {
            return '=';
        } else if (/^['"]/.test(piece)) {
            return '"';
        } else if (/^[\x00-\x20]+$/.test(piece)) {
            return ' ';
        } else {
            return 'A';
        }
    }
    /**
     * Given a string containing a complete [tag] (including its brackets), break it down into its components and return them as an array.
     *
     * @param tag The tag to decode.
     * @return Returns the object representation of the tag.
     */
    protected decodeTag(tag: string): TagType {
        Debugger.debug("Lexer.InternalDecodeTag: input:", tag);
        // Create the initial result object.
        const result: TagType = {'_tag': tag, '_endtag': '', '_name': '', '_hasend': false, '_end': false, '_default': false};
        // Strip off the [brackets] around the tag, leaving just its content.
        tag = tag.slice(1, tag.length - 1);
        // The starting bracket *must* be followed by a non-whitespace character.
        const ch = tag.slice(0, 1).charCodeAt(0);
        if (ch >= 0 && ch <= 32) {
            return result;
        }
        // Break it apart into words, quoted text, whitespace, and equal signs.
        const pieces = preg_split(
            "/(\\\"[^\\\"]+\\\"|\\'[^\\']+\\'|=|[\\x00-\\x20]+)/",
            tag,
            -1,
            PREG_SPLIT_DELIM_CAPTURE | PREG_SPLIT_NO_EMPTY
        );
        let ptr = 0;
        let type;
        // Handle malformed (empty) tags correctly.
        if (pieces.length < 1) {
            return result;
        }
        // The first piece should be the tag name, whatever it is.  If it starts with a /
        // we remove the / and mark it as an end tag.
        if (pieces[ptr] && pieces[ptr].slice(0, 1) === '/') {
            result['_name'] = pieces[ptr++].slice(1).toLowerCase();
            result['_end'] = true;
        } else {
            result['_name'] = pieces[ptr++].toLowerCase();
            result['_end'] = false;
        }
        // Skip whitespace after the tag name.
        while ((type = this.classifyPiece(ptr, pieces)) === ' ') {
            ptr++;
        }
        const params: Param[] = [];
        let value;
        // If the next piece is an equal sign, then the tag's default value follows.
        if (type !== '=') {
            result['_default'] = false;
            params.push({'key': '', 'value': ''});
        } else {
            ptr++;
            // Skip whitespace after the initial equal-sign.
            while ((type = this.classifyPiece(ptr, pieces)) === ' ') {
                ptr++;
            }
            // Examine the next (real) piece, and see if it's quoted; if not, we need to
            // use heuristics to guess where the default value begins and ends.
            if (type === "\"") {
                value = this.stripQuotes(pieces[ptr++]);
            } else {
                // Collect pieces going forward until we reach an = sign or the end of the
                // tag; then rewind before whatever comes before the = sign, and everything
                // between here and there becomes the default value.  This allows tags like
                // [font=Times New Roman size=4] to make sense even though the font name is
                // not quoted.  Note, however, that there's a special initial case, where
                // any equal-signs before whitespace are considered to be part of the parameter
                // as well; this allows an ugly tag like [url=http://foo?bar=baz target=my_window]
                // to behave in a way that makes (tolerable) sense.
                let afterSpace = false;
                let start = ptr;
                while ((type = this.classifyPiece(ptr, pieces)) !== -1) {
                    if (type === ' ') {
                        afterSpace = true;
                    }
                    if (type === '=' && afterSpace) {
                        break;
                    }
                    ptr++;
                }
                if (type === -1) {
                    ptr--;
                }
                // We've now found the first (appropriate) equal-sign after the start of the
                // default value.  (In the example above, that's the "=" after "target"+)  We
                // now have to rewind back to the last whitespace to find where the default
                // value ended.
                if (type === '=') {
                    // Rewind before = sign.
                    ptr--;
                    // Rewind before any whitespace before = sign.
                    while (ptr > start && this.classifyPiece(ptr, pieces) === ' ') {
                        ptr--;
                    }
                    // Rewind before any text elements before that.
                    while (ptr > start && this.classifyPiece(ptr, pieces) !== ' ') {
                        ptr--;
                    }
                }
                // The default value is everything from `start` to `ptr`, inclusive.
                value = "";
                for (; start <= ptr; start++) {
                    if (this.classifyPiece(start, pieces) === ' ') {
                        value += " ";
                    } else {
                        value += this.stripQuotes(pieces[start]);
                    }
                }
                value = value.trim();
                ptr++;
            }
            result['_default'] = value;
            params.push({'key': '', 'value': value});
        }
        // The rest of the tag is composed of either floating keys or key=value pairs, so walk through
        // the tag and collect them all.  Again, we have the nasty special case where an equal sign
        // in a parameter but before whitespace counts as part of that parameter.
        while ((type = this.classifyPiece(ptr, pieces)) !== -1) {
            let key = '';
            // Skip whitespace before the next key name.
            while (type === ' ') {
                ptr++;
                type = this.classifyPiece(ptr, pieces);
            }
            // Decode the key name.
            if (type === 'A' || type === '"') {
                if (pieces[ptr]) {
                    key = this.stripQuotes(pieces[ptr].toLowerCase());
                } else {
                    key = '';
                }
                ptr++;
            } else if (type === '=') {
                ptr++;
                continue;
            } else if (type === -1) {
                break;
            }
            // Skip whitespace after the key name.
            while ((type = this.classifyPiece(ptr, pieces)) === ' ') {
                ptr++;
            }
            // If an equal-sign follows, we need to collect a value.  Otherwise, we
            // take the key itself as the value.
            if (type !== '=') {
                value = this.stripQuotes(key);
            } else {
                ptr++;
                // Skip whitespace after the equal sign.
                while ((type = this.classifyPiece(ptr, pieces)) === ' ') {
                    ptr++;
                }
                if (type === '"') {
                    // If we get a quoted value, take that as the only value.
                    value = this.stripQuotes(pieces[ptr++]);
                } else if (type !== -1) {
                    // If we get a non-quoted value, consume non-quoted values
                    // until we reach whitespace.
                    value = pieces[ptr++];
                    while ((type = this.classifyPiece(ptr, pieces)) !== -1
                        && type !== ' ') {
                        value += pieces[ptr++];
                    }
                } else {
                    value = "";
                }
            }
            // Record this in the associative array if it's a legal public identifier name.
            // Legal *public* identifier names must *not* begin with an underscore.
            if (key.slice(0, 1) !== '_') {
                result[key] = value;
            }
            // Record this in the parameter list always.
            params.push({'key': key, 'value': value});
        }
        // Add the parameter list as a member of the associative array.
        result['_params'] = params;
        // In debugging modes, output the tag as we collected it.
        Debugger.debug("Lexer.InternalDecodeTag: output:", result);
        // Save the resulting parameters, and return the whole shebang.
        return result;
    }
}