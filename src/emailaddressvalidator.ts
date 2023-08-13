//PHP Methods
//TODO: Replace all PHP methods with native JavaScript
import preg_replace from "locutus/php/pcre/preg_replace";
import preg_match from "locutus/php/pcre/preg_match";
import strrpos from "locutus/php/strings/strrpos";
import substr from "locutus/php/strings/substr";

export default class EmailAddressValidator {
    // Check email address validity.
    // @param   strEmailAddress     Email address to be checked
    // @return  True if email is valid, false if not
    check_email_address($strEmailAddress: string) {
        // If magic quotes is "on", email addresses with quote marks will
        // fail validation because of added escape characters. Uncommenting
        // the next three lines will allow for this issue.
        //if (get_magic_quotes_gpc()) {
        //    $strEmailAddress = stripslashes($strEmailAddress);
        //}
        // Control characters are not allowed
        if (preg_match('[\x00-\x1F\x7F-\xFF]', $strEmailAddress)) {
            return false;
        }
        // Split it into sections using last instance of "@"
        const $intAtSymbol = strrpos($strEmailAddress, '@');
        if ($intAtSymbol === false) {
            // No "@" symbol in email.
            return false;
        }
        const $arrEmailAddress: string[] = [];
        const $arrTempAddress: string[] = [];
        $arrEmailAddress[0] = substr($strEmailAddress, 0, $intAtSymbol);
        $arrEmailAddress[1] = substr($strEmailAddress, $intAtSymbol + 1);
        // Count the "@" symbols. Only one is allowed, except where
        // contained in quote marks in the local part. Quickest way to
        // check this is to remove anything in quotes.
        $arrTempAddress[0] = preg_replace('/"[^"]+"/', '', $arrEmailAddress[0]);
        $arrTempAddress[1] = $arrEmailAddress[1];
        const $strTempAddress = $arrTempAddress[0] + $arrTempAddress[1];
        // Then check - should be no "@" symbols.
        if (strrpos($strTempAddress, '@') !== false) {
            // "@" symbol found
            return false;
        }
        // Check local portion
        if (!this.check_local_portion($arrEmailAddress[0])) {
            return false;
        }
        // Check domain portion
        if (!this.check_domain_portion($arrEmailAddress[1])) {
            return false;
        }
        // If we're still here, all checks above passed. Email is valid.
        return true;
    }
    // Checks email section before "@" symbol for validity
    // @param   strLocalPortion     Text to be checked
    // @return  True if local portion is valid, false if not
    check_local_portion($strLocalPortion: string) {
        // Local portion can only be from 1 to 64 characters, inclusive.
        // Please note that servers are encouraged to accept longer local
        // parts than 64 characters.
        if (!this.check_text_length($strLocalPortion, 1, 64)) {
            return false;
        }
        // Local portion must be:
        // 1) a dot-atom (strings separated by periods)
        // 2) a quoted string
        // 3) an obsolete format string (combination of the above)
        const $arrLocalPortion = $strLocalPortion.split('.');
        for (let $i = 0, $max = $arrLocalPortion.length; $i < $max; $i++) {
            if (!preg_match('^('
                +'([A-Za-z0-9!#$%&\'*+/=?^_`{|}~-]'
                +'[A-Za-z0-9!#$%&\'*+/=?^_`{|}~-]{0,63})'
                +'|'
                +'("[^\\"]{0,62}")'
                +')$'
            , $arrLocalPortion[$i])
            ) {
                return false;
            }
        }
        return true;
    }
    // Checks email section after "@" symbol for validity
    // @param   strDomainPortion     Text to be checked
    // @return  True if domain portion is valid, false if not
    check_domain_portion($strDomainPortion: string) {
        // Total domain can only be from 1 to 255 characters, inclusive
        if (!this.check_text_length($strDomainPortion, 1, 255)) {
            return false;
        }
        // Check if domain is IP, possibly enclosed in square brackets.
        if (preg_match('^(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])'
                +'(.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])){3}$', $strDomainPortion) ||
            preg_match('^\\[(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])'
                +'(.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])){3}\\]$', $strDomainPortion)) {
            return true;
        } else {
            const $arrDomainPortion = $strDomainPortion.split(".");
            if ($arrDomainPortion.length < 2) {
                return false; // Not enough parts to domain
            }
            for (let $i = 0, $max = $arrDomainPortion.length; $i < $max; $i++) {
                // Each portion must be between 1 and 63 characters, inclusive
                if (!this.check_text_length($arrDomainPortion[$i], 1, 63)) {
                    return false;
                }
                if (!preg_match('^(([A-Za-z0-9][A-Za-z0-9-]{0,61}[A-Za-z0-9])|'
                    +'([A-Za-z0-9]+))$', $arrDomainPortion[$i])
                ) {
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
     * @return True if string is within bounds (inclusive), false if not
     */
    check_text_length($strText: string, $intMinimum: number, $intMaximum: number) {
        // Minimum and maximum are both inclusive
        const $intTextLength = $strText.length;
        if (($intTextLength < $intMinimum) || ($intTextLength > $intMaximum)) {
            return false;
        } else {
            return true;
        }
    }
}