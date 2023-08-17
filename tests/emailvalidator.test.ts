// @ts-nocheck
import EmailAddressValidator from "../src/emailaddressvalidator";


const validator = new EmailAddressValidator();
describe("Email Validation Tests", function() {
    it("Validation Test", function(done) {
        expect(validator.check_email_address("test@test.com")).toBe(true);
        expect(validator.check_email_address("test@test.")).toBe(false);
        expect(validator.check_email_address("test@test.com\x00")).toBe(false);
        expect(validator.check_email_address("test")).toBe(false);
        expect(validator.check_email_address("testtesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttesttest@test.com")).toBe(false);
        expect(validator.check_email_address("\"test\".test@test.com")).toBe(true);
        done();
    });
});