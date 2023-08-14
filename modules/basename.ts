export default function basename(str: string): string {
    if (!str) return str;
    const base = str;
    const lastChar = str.charAt(str.length - 1);
    if (lastChar === '/' || lastChar === '\\')
        base.slice(0, -1);

    return base.replace(/^.*[/\\]/g, '');
}