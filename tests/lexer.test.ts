import BBCodeLexer from "../src/bbcodelexer";

describe("Lexer Tests that aren't covered in bbcode testing", function() {
    it("GuessTextLength Tests", function() {
        expect(new BBCodeLexer("testing, test, test [b]test[/b] test").guessTextLength()).toBe(36);
    });
});