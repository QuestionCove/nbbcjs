const escapeChars = {
    '¢': 'cent',
    '£': 'pound',
    '¥': 'yen',
    '€': 'euro',
    '©':'copy',
    '®': 'reg',
    '<': 'lt',
    '>': 'gt',
    '"': 'quot',
    '&': 'amp',
    '\'': 'apos'
};

let encodeRegexString = '[';
for(const key in escapeChars) {
    encodeRegexString += key;
}
encodeRegexString += ']';
const encodeRegex = new RegExp(encodeRegexString, 'g');

const decodeRegexArr: string[] = [];
for(const key in escapeChars) {
    decodeRegexArr.push("&"+escapeChars[key]+";");
}
const decodeRegexString = `(${decodeRegexArr.join('|')})`;
const decodeRegex = new RegExp(decodeRegexString, 'g');

const decodeChars = {};
for(const key in escapeChars){
    decodeChars[`&${escapeChars[key]};`] = key;
}

export function htmlEncode(str: string): string {
    if (!str) return str; 
    return str.replace(encodeRegex, function(char) {
        return '&' + escapeChars[char] + ';';
    });
}

export function htmlDecode(str: string): string {
    return str.replace(decodeRegex, function(char) {
        return decodeChars[char];
    });
}