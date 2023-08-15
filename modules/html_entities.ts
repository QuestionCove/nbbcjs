const escapeChars: Record<string, string> = {
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

const decodeChars: Record<string, string> = {};
for(const key in escapeChars){
    decodeChars[`&${escapeChars[key]};`] = key;
}

export function htmlEncode(str: any): string {
    if (!str || typeof str !== "string") return ''; 
    return str.replace(encodeRegex, function(char) {
        return '&' + escapeChars[char] + ';';
    });
}

export function htmlDecode(str: any): string {
    if (!str || typeof str !== "string") return '';
    return str.replace(decodeRegex, function(char) {
        return decodeChars[char];
    });
}