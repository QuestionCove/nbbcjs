export enum BBMode {
    /**
     * Swap BBCode tags with HTML tags.
     */
    SIMPLE = 0,
    /**
     * Use provided callback function or method.
     */
    CALLBACK = 1,
    /**
     * Use internal callback function.
     */
    INTERNAL = 2,
    /**
     * Use library callback function.
     */
    LIBRARY = 3,
    /**
     * Insert BBCode input into the provided HTML template.
     */
    ENHANCED = 4
}

export enum BBStack {
    /**
     * Stack node: Token type
     */
    TOKEN = 0,
    /**
     * Stack node: HTML text content
     */
    TEXT = 1,
    /**
     * Stack node: Tag contents (array)
     */
    TAG = 2,
    /**
     * Stack node: Classname
     */
    CLASS = 3
}

export enum BBToken {
    /**
     * Token: End-of-input
     */
    EOI = 0,
    /**
     * Token: Non-newline whitespace
     */
    WS = 1,
    /**
     * Token: A single newline
     */
    NL = 2,
    /**
     * Token: Non-whitespace non-tag plain text
     */
    TEXT = 3,
    /**
     * Token: A [start tag] or [empty tag]
     */
    TAG = 4,
    /**
     * Token: An [/end tag]
     */
    ENDTAG = 5
}

export enum BBType {
    /**
     * Content type: Content may not be provided by user.
     */
    PROHIBIT = -1,
    /**
     * Content type: Content is permitted but not required.
     */
    OPTIONAL = 0,
    /**
     * Content type: Content may not be empty or whitespace.
     */
    REQUIRED = 1,
    /**
     * Content type: Content is not processed as BBCode.
     */
    VERBATIM = 2
}

export enum BBAction {
    /**
     * Callback operation: Check validitity of input
     */
    CHECK = 1,
    /**
     * Callback operation: Generate HTML output
     */
    OUTPUT = 2
}

export enum LexState {
    /**
     * Lexer: Next token is plain text.
     */
    TEXT = 0,
    /**
     * Lexer: Next token is non-text element.
     */
    TAG = 1
} 

export enum DebugLevel {
    all = 0,
    debug = 1,
    info = 2,
    warn = 3,
    error = 4,
    none = 5
}