function pad(str, length = 0) {
    if (Array.isArray(str))
        str = str.join('');

    if (typeof str === 'undefined')
        str = '-';

    if (typeof str !== 'string')
        str += '';

    while (str.length < length)
        str += ' ';

    return str;
}

function print(tok, str = tok.source, prefix = '', isLast = true) {
    const treeWidth = 80;
    if (!prefix) {
        // Print headers
        console.log(pad('Tree', treeWidth) + 'Derived from');
        console.log(pad('-----', treeWidth) + '-------------');
    }

    const value = (tok.type != 'LITERAL') && JSON.stringify(tok.value) || '';
    let data = [tok.name, value.replace(/^"|"$/g, '')].filter(v => !!v).join('=');
    if (data)
        data = ` (${data})`;
    const body = JSON.stringify(str.substr(tok.start, tok.end - tok.start + 1)).substr(0, 100);
    const angle = prefix && (isLast ? '└ ' : '├ ');
    let out = (prefix || '  ') + angle  + tok.type + data;
    out = pad(out, treeWidth);
    console.log(out + body);
    tok.children.forEach((c, i) => print(c, str, prefix + (isLast ? '  ' : '│ ' ), i == tok.children.length - 1));
}

module.exports = { print, pad };
