/**
 * This is the EmailAddressValidator Class, it is resposible for 
 * verifying an input email address so the user can't input 
 * incorrectly formatted email addresses
 */
export default class EmailAddressValidator {
    /**
     * Check email address validity.
     * @param emailAddress Email address to be checked
     * @return true if email is valid, false if not
     */
    check_email_address(emailAddress: string): boolean {
        // Control characters are not allowed
        if (/[\x00-\x1F\x7F-\xFF]/.test(emailAddress)) {
            return false;
        }
        // Split it into sections using last instance of "@"
        const intAtSymbol = emailAddress.lastIndexOf('@');
        if (intAtSymbol === -1) {
            // No "@" symbol in email.
            return false;
        }
        const arrEmailAddress: string[] = [];
        const arrTempAddress: string[] = [];
        arrEmailAddress[0] = emailAddress.slice(0, intAtSymbol);
        arrEmailAddress[1] = emailAddress.slice(intAtSymbol + 1);
        // Count the "@" symbols. Only one is allowed, except where
        // contained in quote marks in the local part. Quickest way to
        // check this is to remove anything in quotes.
        arrTempAddress[0] = arrEmailAddress[0].replace(/"[^"]+"/g, '');
        arrTempAddress[1] = arrEmailAddress[1];
        const strTempAddress = arrTempAddress[0] + arrTempAddress[1];
        // Then check - should be no "@" symbols.
        if (strTempAddress.lastIndexOf('@') > -1) {
            // "@" symbol found
            return false;
        }
        // Check local portion
        if (!this.check_local_portion(arrEmailAddress[0])) {
            return false;
        }
        // Check domain portion
        if (!this.check_domain_portion(arrEmailAddress[1])) {
            return false;
        }
        // If we're still here, all checks above passed. Email is valid.
        return true;
    }
    /**
     *  Checks email section before "@" symbol for validity
     * @param localPortion Text to be checked
     * @return true if local portion is valid, false if not
     */
    check_local_portion(localPortion: string) {
        // Local portion can only be from 1 to 64 characters, inclusive.
        // Please note that servers are encouraged to accept longer local
        // parts than 64 characters.
        if (!this.check_text_length(localPortion, 1, 64)) {
            return false;
        }
        // Local portion must be:
        // 1) a dot-atom (strings separated by periods)
        // 2) a quoted string
        // 3) an obsolete format string (combination of the above)
        const arrLocalPortion = localPortion.split('.');
        for (let i = 0, max = arrLocalPortion.length; i < max; i++) {
            if (!new RegExp('^('
                +'([A-Za-z0-9!#$%&\'*+/=?^_`{|}~-]'
                +'[A-Za-z0-9!#$%&\'*+/=?^_`{|}~-]{0,63})'
                +'|'
                +'("[^\\"]{0,62}")'
                +')$').test(arrLocalPortion[i])) {
                return false;
            }
        }
        return true;
    }
    /**
     * Checks email section after "@" symbol for validity
     * @param domainPortion Text to be checked
     * @return True if domain portion is valid, false if not
     */
    check_domain_portion(domainPortion: string) {
        // Total domain can only be from 1 to 255 characters, inclusive
        if (!this.check_text_length(domainPortion, 1, 255)) {
            return false;
        }
        // Check if domain is IP, possibly enclosed in square brackets.
        if (new RegExp('^(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])'
                +'(.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])){3}$').test(domainPortion) ||
            new RegExp('^\\[(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])'
                +'(.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])){3}\\]$').test(domainPortion)) {
            return true;
        } else {
            const arrDomainPortion = domainPortion.split(".");
            if (arrDomainPortion.length < 2) {
                return false; // Not enough parts to domain
            }
            for (let i = 0, max = arrDomainPortion.length; i < max; i++) {
                // Each portion must be between 1 and 63 characters, inclusive
                if (!this.check_text_length(arrDomainPortion[i], 1, 63)) {
                    return false;
                }
                if (!new RegExp('^(([A-Za-z0-9][A-Za-z0-9-]{0,61}[A-Za-z0-9])|'
                    +'([A-Za-z0-9]+))$').test(arrDomainPortion[i])) {
                    return false;
                }
            }
        }
        return true;
    }
    /** 
     * Check given text length is between defined bounds
     * @param strText Text to be checked
     * @param intMinimum Minimum acceptable length
     * @param intMaximum Maximum acceptable length
     * @return true if string is within bounds (inclusive), false if not
     */
    check_text_length(strText: string, intMinimum: number, intMaximum: number) {
        // Minimum and maximum are both inclusive
        const intTextLength = strText.length;
        if ((intTextLength < intMinimum) || (intTextLength > intMaximum)) {
            return false;
        } else {
            return true;
        }
    }
}