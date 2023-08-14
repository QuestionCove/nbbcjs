const tags = /<\/?([a-z0-9]*)\b[^>]*>?/gi;
const commentsAndPHP = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;

export default function strip_tags(str: string): string {
    let after = str;

    //Recursively remove tags to make sure tags hidden within tags don't exist
    while (true) {
        const before = after;
        after = before.replace(tags, '').replace(commentsAndPHP, '');
        if (before === after) return after;
    }
}