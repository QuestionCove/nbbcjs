export const PREG_SPLIT_DELIM_CAPTURE = 1;
export const PREG_SPLIT_NO_EMPTY = 2;

export default function preg_split(
    pattern: string,
    subject: string,
    limit?: number,
    flags?: number
): string[] {
    if (flags === undefined) {
        flags = 0;
    }

    const isCapture = (flags & 1) === 1;
    const noEmpty = (flags & 2) === 2;

    const parsedpattern = pattern.replace(/\/([^/]*$)/, "").replace(/\//,'');
    //const patternflags = pattern.match(/\/([^/]*$)/)[1].toLowerCase();
    let split = [];
    if (subject)
        split = subject.split(RegExp(parsedpattern, ""));

    if (noEmpty)
        split = split.filter(item => item);

    return split;
}