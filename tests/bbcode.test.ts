import BBCode from "../src/bbcode";

const bbcode = new BBCode();
describe('BBCode Class Tests', () => { 
    it("Getter/Setter Tests", function(done) {
        bbcode.addEmoji("hello", "hello.png");
        expect(bbcode.getEmoji("hello")).toBe("hello.png");
        expect(bbcode.getDefaultEmoji(":)")).toBe("smile.gif");
        bbcode.clearEmoji();
        expect(bbcode.getEmoji(":)")).toBe(false);
        bbcode.setDefaultEmojis();
        expect(bbcode.getDefaultEmojis()).toBeTruthy();
        expect(bbcode.getEmoji(":)")).toBe("smile.gif");
        bbcode.addEmoji(":)", "hello.png");
        expect(bbcode.getEmoji(":)")).toBe("hello.png");
        bbcode.removeEmoji(":)");
        bbcode.setDefaultEmoji(":)");
        bbcode.setEnableEmoji(false);
        bbcode.setMaxEmoji(50);
        expect(bbcode.getMaxEmoji()).toBe(50);
        bbcode.setMaxEmoji(-5);
        expect(bbcode.getMaxEmoji()).toBe(-1);
        expect(bbcode.getEnableEmoji()).toBe(false);
        bbcode.setAllowAmpersand(true);
        expect(bbcode.getAllowAmpersand()).toBe(true);
        bbcode.clearRules();
        expect(bbcode.getRule("b")).toBe(false);
        bbcode.setDefaultRules();
        expect(bbcode.getRule("b")).toBeTruthy();
        expect(bbcode.getDefaultRule("b")).toBeTruthy();
        bbcode.setDefaultRule("b");
        bbcode.removeRule("b");
        expect(bbcode.getRule("b")).toBe(false);
        expect(bbcode.getDefaultRules()).toBeTruthy();
        bbcode.setDefaultRule("test");
        bbcode.setEmojiDir("/");
        expect(bbcode.getEmojiDir()).toBe("/");
        bbcode.setEmojiURL("/");
        expect(bbcode.getEmojiURL()).toBe("/");
        bbcode.setPreTrim();
        expect(bbcode.getPreTrim()).toBe("a");
        bbcode.setPostTrim();
        expect(bbcode.getPostTrim()).toBe("a");
        bbcode.setRoot("block");
        bbcode.setRootBlock();
        bbcode.setRootInline();
        expect(bbcode.getRoot()).toBe("inline");
        bbcode.setDebug(true);
        expect(bbcode.getDebug()).toBe(true);
        bbcode.setLogLevel(1);
        expect(bbcode.getLogLevel()).toBe(1);
        bbcode.setTagMarker("[");
        expect(bbcode.getTagMarker()).toBe("[");
        bbcode.setIgnoreNewlines(false);
        expect(bbcode.getIgnoreNewlines()).toBe(false);
        bbcode.setLimit(5000);
        expect(bbcode.getLimit()).toBe(5000);
        bbcode.setLimitTail(".....");
        expect(bbcode.getLimitTail()).toBe(".....");
        bbcode.setLimitPrecision(0.15);
        expect(bbcode.getLimitPrecision()).toBe(0.15);
        bbcode.setPlainMode(false);
        expect(bbcode.getPlainMode()).toBe(false);
        bbcode.setDetectURLs(true);
        expect(bbcode.getDetectURLs()).toBe(true);
        bbcode.setURLPattern(`<a href="{$url/h}" class="urltest"{$target/v}>{$content/v}</a>`);
        expect(bbcode.getURLPattern()).toBe(`<a href="{$url/h}" class="urltest"{$target/v}>{$content/v}</a>`);
        bbcode.setURLTemplate("test");
        expect(bbcode.getURLTemplate()).toBe("test");
        bbcode.setQuoteTemplate("test");
        expect(bbcode.getQuoteTemplate()).toBe("test");
        bbcode.setWikiURLTemplate("test");
        expect(bbcode.getWikiURLTemplate()).toBe("test");
        bbcode.setEmailTemplate("test");
        expect(bbcode.getEmailTemplate()).toBe("test");
        bbcode.setEscapeContent(false);
        expect(bbcode.getEscapeContent()).toBe(false);
        bbcode.setWikiURL("test.com");
        expect(bbcode.getLocalImgDir()).toBe("img");
        bbcode.setRuleHTML("test");
        expect(bbcode.getRuleHTML()).toBe("test");
        done();
    });
});