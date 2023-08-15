const urlRegex = new RegExp(['(?:([^:\\/?#]+):)?', '(?:\\/\\/()(?:(?:()(?:([^:@\\/]*):?([^:@\\/]*))?@)?([^:\\/?#]*)(?::(\\d*))?))?', '()', '(?:(()(?:(?:[^?#\\/]*\\/)*)()(?:[^?#]*))(?:\\?([^#]*))?(?:#(.*))?)'].join(''));
const urlKey = ['source', 'scheme', 'authority', 'userInfo', 'user', 'pass', 'host', 'port', 'relative', 'path', 'directory', 'file', 'query', 'fragment'];
export default function parse_url(str: string): Record<string, string> | null {
    const uri: Record<string, string> = {};
    const parsed = urlRegex.exec(str);
    if (!parsed) return null; 
    let i = 14;
    while (i--) {
        if (parsed[i]) {
            uri[urlKey[i]] = parsed[i];
        }
    }
    delete uri.source;
    return uri;
}