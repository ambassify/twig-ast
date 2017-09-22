const _omit = require('lodash/omit');
const _invert = require('lodash/invert');
const _some = require('lodash/some');

const mkid = (function(i) {return () => i += (i == 0 ? 1 : i); }(0));

const TEXT = mkid();
const TWIG = mkid();

const EXPRESSION = TWIG | mkid();
const EXPRESSION_LIST = mkid();
const BRACKETS = mkid();

const LITERAL = mkid();
const VARIABLE = TWIG | mkid();
const ARRAY = TWIG | mkid();
const STRING = TWIG | mkid();
const INTEGER = TWIG | mkid();
const BOOLEAN = TWIG | mkid();
const NULL = TWIG | mkid();

const OPERATOR = TWIG | mkid();

const FUNCTION = VARIABLE | mkid();
const ARGUMENT_LIST = EXPRESSION_LIST | mkid();

const OBJECT = TWIG | mkid();
const OBJECT_PROPERTY = TWIG | mkid();
const OBJECT_VALUE = EXPRESSION | mkid();

const TAG = TWIG | mkid();
const TAG_OUTPUT = TAG | mkid();
const TAG_CONTROL = TAG | mkid();
const TAG_ARGUMENT = EXPRESSION | mkid();
const BLOCK = TEXT | mkid();

const types = {TEXT,TWIG,EXPRESSION,VARIABLE,OBJECT,BLOCK,TAG,TAG_ARGUMENT,OBJECT_PROPERTY,OBJECT_VALUE,STRING,FUNCTION,TAG_OUTPUT,TAG_CONTROL,EXPRESSION_LIST,LITERAL,ARRAY,INTEGER,ARGUMENT_LIST,BOOLEAN,NULL,OPERATOR,BRACKETS};
const names = _invert(types);

const isType = (state, ...types) => _some(types, type => (state & type) == type);
const isText = state => isType(state, TEXT);

class Token {
    constructor(type, start, options) {
        Object.assign(this, options);
        this.type = names[type];
        this.parent = undefined;
        this.children = [];

        this.start = start;
        this.end = undefined;

        this.name = undefined; // Used by identifiers (object key, variable, ...)
        this.closing = undefined; // Used by TAG_CONTROL to indicate a closing tag
        this.value = undefined; // Used to store parsed values of expressions.
        this.expr = undefined; // Used to hold the specific expressions on EXPRESSION node.
    }

    is(type) {
        const id = types[this.type];
        return isType(id, type);
    }

    add(token) {
        this.children.push(token);
    }

    toJSON() {
        return _omit(this, 'parent', 'expr');
    }
}

function matchSequence(chars, seq, offset) {
    seq = seq.split('');
    let len = seq.length;

    while (len-- > 0)
        if (chars[offset + len] != seq[len])
            return false;

    return true;
}

function isEmptyChar(c) {
    return /\s/.test(c);
}

function getLiteral(str, tok, i) {
    const start = (tok.children.slice().pop() || { end: tok.start - 1 }).end + 1;
    const literal = new Token(LITERAL, start);
    literal.end = i - 1;
    literal.value = str.substr(literal.start, i - literal.start);
    return literal;
}

function findOpeningTag(name, tok) {
    while (tok && (!tok.is(TAG_CONTROL) || tok.name != name))
        tok = tok.parent;

    return tok;
}

function readUntil(str, chars, offset, condition) {
    let i = offset;

    while (i < str.length && !condition(chars[i], i, str.substr(offset, i - offset + 1), str))
        i++;

    return [i - 1, str.substr(offset, i - offset)];
}

function matchToken(str, state = TEXT, offset = 0, skip = 0, parentToken = null) {
    let i = (offset + skip) - 1;
    const chars = Array.isArray(str) ? str : str.split('');
    const tok = new Token(state, offset);
    tok.parent = parentToken;
    tok.source = str;

    const ms = seq => matchSequence(chars, seq, i);
    const m = (type, start, skip) => matchToken(str, type, start, skip, tok);

    while (typeof i === 'number' && i++ < str.length) {
        const cur = chars[i];
        // console.log(pad(tok.type, 20), pad(tok.name, 15), pad(i, 6), pad(JSON.stringify(cur), 4), JSON.stringify(str.substr(0, i) + '*' + str.substr(i, 10)));

        if (isType(state, BLOCK) && ms('{%')) {
            const tag = m(TAG_CONTROL, i, 2);

            if (tag.closing) {
                const name = tag.name.replace(/^end/, '');
                const open = findOpeningTag(name, tok);

                if (open) {
                    open.closingTag = tag;
                    tag.openingTag = open;
                    open.block = tok;
                    tag.block = tok;
                }

                tok.end = tag.start - 1;
                return tok;
            } else {
                tok.add(tag);
                i = tag.end;
            }

        } else if (isText(state) && ms('{%')) {
            tok.add(getLiteral(str, tok, i));

            const tag = m(TAG_CONTROL, i, 2);
            i = tag.end;
            tok.add(tag);
        } else if (isText(state) && ms('{{')) {
            tok.add(getLiteral(str, tok, i));

            const variable = m(TAG_OUTPUT, i, 2);
            i = variable.end;
            tok.add(variable);
        } else if (isType(state, TAG_OUTPUT) && ms('}}')) {
            tok.end = i + 1;
            return tok;
        } else if (isType(state, TAG_OUTPUT) && !isEmptyChar(cur)) {
            const expr = m(EXPRESSION, i);
            i = expr.end;
            tok.end = expr.end;

            // No expression found
            if (expr.children.length < 1)
                return tok;

            tok.add(expr);
        } else if (isType(state, VARIABLE) && tok.name && cur == '(') {
            tok.type = names[FUNCTION];
            const args = m(ARGUMENT_LIST, i + 1);
            i = args.end + 1;
            tok.add(args);
        } else if (isType(state, VARIABLE) && !tok.name && !/[a-z0-9_.$]/i.test(cur)) {
            tok.name = str.substr(tok.start, i - tok.start);
            tok.end = i - 1;
            i -= 1;
        } else if (isType(state, VARIABLE) && tok.name && !/[a-z0-9_.$]/i.test(cur)) {
            tok.end = i - 1;
            return tok;
        } else if (isType(state, TAG_CONTROL) && !tok.name && !isEmptyChar(cur)) {
            const [ end, name ] = readUntil(str, chars, i, c => isEmptyChar(c));

            i = end;
            tok.name = name;
        } else if (isType(state, TAG_ARGUMENT) && ms('%}')) {
            tok.end = i - 1;
            return tok;
        } else if (isType(state, TAG_CONTROL) && ms('%}')) {
            tok.end = i + 1;

            // closing tag
            if (/^end/.test(tok.name)) {
                tok.closing = true;
                return tok;
            }

            const block = m(BLOCK, i + 2);
            i = tok.closingTag.end;
            tok.end = i;
            tok.closing = false;
            tok.add(block);
            return tok;
        } else if (isType(state, TAG_CONTROL) && tok.name && !isEmptyChar(cur)) {
            const arg = m(TAG_ARGUMENT, i, 0);
            i = arg.end;
            tok.end = arg.end;
            tok.add(arg);
        } else if (isType(state, EXPRESSION_LIST) && (tok.children.length == 0 || cur == ',' )) {
            const expr = m(EXPRESSION, i + (cur == ',' ? 1 : 0), 0);
            i = expr.end;
            tok.end = expr.end;
            tok.add(expr);
        } else if (isType(state, EXPRESSION) && cur == '{') {
            const obj = m(OBJECT, i, 1);
            i = obj.end;
            tok.end = obj.end;
            tok.expr = obj;
            tok.add(obj);
        } else if (isType(state, EXPRESSION) && cur == '[') {
            const arr = m(ARRAY, i, 1);
            i = arr.end;
            tok.end = arr.end;
            tok.expr = arr;
            tok.add(arr);
        } else if (isType(state, EXPRESSION) && cur == '"') {
            const string = m(STRING, i, 1);
            i = string.end;
            tok.end = string.end;
            tok.expr = string;
            tok.add(string);
        } else if (isType(state, EXPRESSION) && (ms('true') || ms('false'))) {
            const bool = new Token(BOOLEAN, i);
            const which = ms('true') ? 'true' : 'false';
            i += which.length - 1;
            bool.end = i;
            bool.value = (which == 'true');
            tok.add(bool);
        } else if (isType(state, EXPRESSION) && ms('null')) {
            const nul = new Token(NULL, i);
            i += 'null'.length - 1;
            nul.end = i;
            nul.value = null;
            tok.add(nul);
        } else if (isType(state, EXPRESSION) && /[a-z$]/i.test(cur)) {
            const variable = m(VARIABLE, i, 0);
            i = variable.end;
            tok.end = variable.end;
            tok.expr = variable;
            tok.add(variable);
        } else if (isType(state, EXPRESSION) && /[0-9.]/i.test(cur)) {
            const integer = m(INTEGER, i, 0);
            i = integer.end;
            tok.end = integer.end;
            tok.expr = integer;
            tok.add(integer);
        } else if (isType(state, EXPRESSION) && cur == '(') {
            const brackets = m(BRACKETS, i, 1);
            i = brackets.end;
            tok.end = brackets.end;
            tok.expr = brackets;
            tok.add(brackets);
        } else if (isType(state, EXPRESSION) && (/[+\-%\/*]/i.test(cur) || ms('++') || ms('--')) ) {
            const operator = m(OPERATOR, i, 0);
            i = operator.end + 1;
            tok.add(operator);

            const expr = m(EXPRESSION, i);
            i = expr.end;
            tok.end = i;
            tok.add(expr);
            return tok;
        } else if (isType(state, INTEGER) && !/[0-9.]/i.test(cur)) {
            tok.value = str.substr(tok.start, i - tok.start);
            tok.value = parseFloat(tok.value, 10);
            tok.end = i - 1;
            return tok;
        } else if (isType(state, OBJECT) && cur == '}') {
            tok.end = i;
            return tok;
        } else if (isType(state, ARRAY) && cur == ']') {
            tok.end = i;
            return tok;
        } else if (isType(state, BRACKETS) && cur == ')') {
            tok.end = i;
            return tok;
        } else if (isType(state, BRACKETS) && !isEmptyChar(cur)) {
            const expr = m(EXPRESSION, i, 0);
            i = expr.end;
            tok.end = expr.end;
            tok.expr = expr;
            tok.add(expr);
        } else if (isType(state, ARRAY) && !isEmptyChar(cur)) {
            const values = m(EXPRESSION_LIST, i, 0);
            i = values.end;
            tok.end = values.end;
            tok.add(values);
        } else if (isType(state, OBJECT) && !isEmptyChar(cur)) {
            const property = m(OBJECT_PROPERTY, i, 0);
            i = property.end;
            tok.add(property);
        } else if (isType(state, OBJECT_PROPERTY) && !tok.name && !isEmptyChar(cur)) {
            const [ end, name ] = readUntil(str, chars, i, (c) => /[^a-z0-9_]/i.test(c));
            i = end;
            tok.name = name;
        } else if (isType(state, OBJECT_PROPERTY) && tok.name && cur == ':') {
            const expr = m(OBJECT_VALUE, i + 1, 0);
            i = tok.end = expr.end;
            tok.expr = expr;
            tok.add(expr);
        } else if (isType(state, OBJECT_PROPERTY) && tok.name && tok.expr && /,|}/.test(cur)) {
            if (cur == ',')
                tok.end = i;
            return tok;
        } else if (isType(state, STRING) && cur == '"' && chars[i-1] != '\\') {
            tok.value = JSON.parse(str.substr(tok.start, i - tok.start + 1));
            tok.end = i;
            return tok;
        } else if (isType(state, OPERATOR) && (/[+\-%\/*]/i.test(cur) || ms('++') || ms('--')) ) {
            const shortOperator = /[+\-%\/*]/i.test(cur);

            if (shortOperator) {
                tok.end = i;
                tok.value = cur;
                return tok;
            }

            tok.end = i + 1;
            tok.value = str.substr(i, 2);
            return tok;
        } else if (isType(state, EXPRESSION) && !isEmptyChar(cur)) {
            tok.end = i - 1;
            return tok;
        } else if (isType(state, EXPRESSION_LIST) && !isEmptyChar(cur)) {
            tok.end = i - 1;
            return tok;
        }
    }

    if (isType(state, EXPRESSION))
        return tok;

    if (tok.parent)
        console.error('Exit from invalid state ' + names[state] + ' at position ' + i);

    if (state === TEXT)
        tok.add(getLiteral(str, tok, i));

    return tok;
}

module.exports = {
    toAST: (str) => matchToken(str),
    isType,
    types
};
