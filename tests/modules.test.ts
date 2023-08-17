// @ts-nocheck
import preg_split, { PREG_SPLIT_DELIM_CAPTURE, PREG_SPLIT_NO_EMPTY } from "../modules/preg_split";
import filter_var from "../modules/filter_var";
import { htmlEncode, htmlDecode } from '../modules/html_entities';
import strip_tags from '../modules/strip_tags';
import basename from '../modules/basename';
import parse_url from "../modules/parse_url";

describe("Basename Tests", function() {
    it("falsey value should be returned as is", function() {
        expect(basename(null)).toBeFalsy();
    });
});

describe("Filter Var Tests", function() {
    it("Int", function() {
        expect(filter_var("50", "FILTER_VALIDATE_INT")).toBe(50);
    });
    it("Float", function() {
        expect(filter_var("50.50", "FILTER_VALIDATE_FLOAT")).toBe(50.50);
    });
    it("Email", function() {
        expect(filter_var("test@test.com", "FILTER_VALIDATE_EMAIL")).toBe("test@test.com");
    });
    it("IP", function() {
        expect(filter_var("192.168.0.1", "FILTER_VALIDATE_IP")).toBe("192.168.0.1");
        expect(filter_var("::1", "FILTER_VALIDATE_IP")).toBeNull();
    });
});