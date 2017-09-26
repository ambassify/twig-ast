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
const NUMBER = TWIG | mkid();
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

const TYPES = {TEXT,TWIG,EXPRESSION,VARIABLE,OBJECT,BLOCK,TAG,TAG_ARGUMENT,OBJECT_PROPERTY,OBJECT_VALUE,STRING,FUNCTION,TAG_OUTPUT,TAG_CONTROL,EXPRESSION_LIST,LITERAL,ARRAY,NUMBER,ARGUMENT_LIST,BOOLEAN,NULL,OPERATOR,BRACKETS};
const NAMES = _invert(TYPES);

const isType = (state, ...types) => _some(types, type => (state & type) == type);
const isText = state => isType(state, TEXT);

class Token {
    constructor(type, start, options) {
        Object.assign(this, options);
        this.type = NAMES[type];
        this.parent = undefined;
        this.source = undefined;
        this.children = [];

        this.start = start;
        this.end = undefined;

        this.name = undefined; // Used by identifiers (object key, variable, ...)
        this.closing = undefined; // Used by TAG_CONTROL to indicate a closing tag
        this.value = undefined; // Used to store parsed values of expressions.
        this.expr = undefined; // Used to hold the specific expressions on EXPRESSION node.
    }

    is(type) {
        const id = TYPES[this.type];
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
    const m = (type, start, _skip) => matchToken(str, type, start, _skip, tok);

    while (typeof i === 'number' && i++ < str.length) {
        const cur = chars[i];
        // console.log(pad(tok.type, 20), pad(tok.name, 15), pad(i, 6), pad(JSON.stringify(cur), 4), JSON.stringify(str.substr(0, i) + '*' + str.substr(i, 10)));

        /**
         * BLOCK is the section enclosed between {% tag %}BLOCK{% endtag %}.
         * The condition below detects the start of the endtag, or the start
         * of a new nested tag.
         */
        if (isType(state, BLOCK) && ms('{%')) {
            const tag = m(TAG_CONTROL, i, 2);

            /**
             * If the detected tag is a closing tag, find the matching
             * parent open tag.
             */
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

        /**
         * When a `{%` occurs in a text section (TEXT,BLOCK,...) we assume
         * it is going to start a control tag.
         */
        } else if (isText(state) && ms('{%')) {
            // Add the TEXT section we just read as literal output.
            tok.add(getLiteral(str, tok, i));

            const tag = m(TAG_CONTROL, i, 2);
            i = tag.end;
            tok.add(tag);

        /**
        * When a `{{` occurs in a text section (TEXT,BLOCK,...) we assume
        * it is going to start an output tag, which can only contain an
        * expression.
        */
        } else if (isText(state) && ms('{{')) {
            tok.add(getLiteral(str, tok, i));

            const variable = m(TAG_OUTPUT, i, 2);
            i = variable.end;
            tok.add(variable);

        /**
        * When a `}}` occurs in an output tag we should close the tag and
        * continue parsing.
        */
        } else if (isType(state, TAG_OUTPUT) && ms('}}')) {
            tok.end = i + 1;
            return tok;

        /**
        * The contents of an output tag should match an expression statement.
        */
        } else if (isType(state, TAG_OUTPUT) && !isEmptyChar(cur)) {
            const expr = m(EXPRESSION, i);
            i = expr.end;
            tok.end = expr.end;

            // No expression found
            if (expr.children.length < 1)
                return tok;

            tok.add(expr);

        /**
         * Whenever we are matching a variable for which we know the name
         * and we see a `(` we should consider it as a function call.
         */
        } else if (isType(state, VARIABLE) && tok.name && cur == '(') {
            tok.type = NAMES[FUNCTION];
            const args = m(ARGUMENT_LIST, i + 1);
            i = args.end + 1;
            tok.add(args);

        /**
         * Read the name of a variable
         *
         * Valid variable characters are a-z, 0-9, underscore, dot and dollarsign
         */
        } else if (isType(state, VARIABLE) && !tok.name && !/[a-z0-9_.$]/i.test(cur)) {
            tok.name = str.substr(tok.start, i - tok.start);
            tok.end = i - 1;
            i -= 1;

        /**
         * When a name has been set the next invalid character indicates the
         * end of the variable name.
         *
         * @note this test should always be performed after the check for a '('
         * symbol which indicates a function.
         */
        } else if (isType(state, VARIABLE) && tok.name && !/[a-z0-9_.$]/i.test(cur)) {
            tok.end = i - 1;
            return tok;

        /**
         * Read the name of a control tag, if not already set and as soon
         * as we see non-empty characters
         */
        } else if (isType(state, TAG_CONTROL) && !tok.name && !isEmptyChar(cur)) {
            const [ end, name ] = readUntil(str, chars, i, c => isEmptyChar(c));

            i = end;
            tok.name = name;

        /**
         * A control tag's arguments end as soon as we read the `%}` sequence.
         */
        } else if (isType(state, TAG_ARGUMENT) && ms('%}')) {
            tok.end = i - 1;
            return tok;

        /**
         * `%}` indicates the end of a control tag, at this point
         * we need to evaluate whether we are dealing with a closing
         * tag or whether a BLOCK section should be started.
         */
        } else if (isType(state, TAG_CONTROL) && ms('%}')) {
            tok.end = i + 1;

            /**
             * closing tag
             * Our current assumption is that control tags starting with
             * and `end` (such as {% endwhile %})
             */
            if (/^end/.test(tok.name)) {
                tok.closing = true;
                return tok;
            }

            /**
             * If the tag is not a closing tag, assume that it starts a
             * new BLOCK section.
             *
             * TODO: This should perform a check on the tag `name` to verify
             * that the tag has a BLOCK section and is not self closing.
             * Such as the {% set var = "test" %}
             */
            const block = m(BLOCK, i + 2);
            i = tok.closingTag.end;
            tok.end = i;
            tok.closing = false;
            tok.add(block);
            return tok;

        /**
         * The sequence following the name of a control tag should be the
         * arguments to the tag.
         *
         * Example: {% tag "argument" %}
         */
        } else if (isType(state, TAG_CONTROL) && tok.name && !isEmptyChar(cur)) {
            const arg = m(TAG_ARGUMENT, i, 0);
            i = arg.end;
            tok.end = arg.end;
            tok.add(arg);

        /**
         * An expression list is a sequence of EXPRESSION statements separated
         * by a `,` character.
         *
         * We assume there are more expressions as long as we have no argument
         * yet or the character following the expression is a `,`
         */
        } else if (isType(state, EXPRESSION_LIST) && (tok.children.length == 0 || cur == ',' )) {
            const expr = m(EXPRESSION, i + (cur == ',' ? 1 : 0), 0);
            i = expr.end;
            tok.end = expr.end;
            tok.add(expr);

        /**
         * A `{` in an expression statement indicates the start of an object
         */
        } else if (isType(state, EXPRESSION) && cur == '{') {
            const obj = m(OBJECT, i, 1);
            i = obj.end;
            tok.end = obj.end;
            tok.expr = obj;
            tok.add(obj);

        /**
         * A `[` in an expression statement indicates the start of an array.
         */
        } else if (isType(state, EXPRESSION) && cur == '[') {
            const arr = m(ARRAY, i, 1);
            i = arr.end;
            tok.end = arr.end;
            tok.expr = arr;
            tok.add(arr);

        /**
         * A `"` in an expression statement indicates the start of a string.
         */
        } else if (isType(state, EXPRESSION) && cur == '"') {
            const string = m(STRING, i, 1);
            i = string.end;
            tok.end = string.end;
            tok.expr = string;
            tok.add(string);

        /**
         * If the character sequence matches `true` or `false` we should
         * parse these as booleans.
         */
        } else if (isType(state, EXPRESSION) && (ms('true') || ms('false'))) {
            const bool = new Token(BOOLEAN, i);
            const which = ms('true') ? 'true' : 'false';
            i += which.length - 1;
            bool.end = i;
            bool.value = (which == 'true');
            tok.add(bool);

        /**
         * If the character sequence matches `null`, we are matching null value.
         */
        } else if (isType(state, EXPRESSION) && ms('null')) {
            const nul = new Token(NULL, i);
            i += 'null'.length - 1;
            nul.end = i;
            nul.value = null;
            tok.add(nul);

        /**
         * If the next character is a-z, $ or underscore we are starting a
         * new variable name or function name.
         */
        } else if (isType(state, EXPRESSION) && /[a-z$_]/i.test(cur)) {
            const variable = m(VARIABLE, i, 0);
            i = variable.end;
            tok.end = variable.end;
            tok.expr = variable;
            tok.add(variable);

        /**
         * If the next character is 0-9 or a dot, we matching a number.
         */
        } else if (isType(state, EXPRESSION) && /[0-9.]/i.test(cur)) {
            const integer = new Token(NUMBER, i);
            const [ end, value ] = readUntil(str, chars, i, (c) => !/[0-9.]/i.test(c));
            integer.value = parseFloat(value, 10);
            integer.end = end;
            i = end;
            tok.end = end;
            tok.expr = integer;
            tok.add(integer);

        /**
         * If the next character is `(`, we are starting a set of brackets
         * that group expressions.
         */
        } else if (isType(state, EXPRESSION) && cur == '(') {
            const brackets = m(BRACKETS, i, 1);
            i = brackets.end;
            tok.end = brackets.end;
            tok.expr = brackets;
            tok.add(brackets);

        /**
         * Match against the symbols for operators.
         *
         * Supported: +, -, %, /, *, ++, --
         */
        } else if (isType(state, EXPRESSION) && (/[+\-%/*]/i.test(cur) || ms('++') || ms('--')) ) {
            const operator = m(OPERATOR, i, 0);
            i = operator.end + 1;
            tok.add(operator);

            const expr = m(EXPRESSION, i);
            i = expr.end;
            tok.end = i;
            tok.add(expr);
            return tok;

        /**
         * End character for an OBJECT is `}`
         */
        } else if (isType(state, OBJECT) && cur == '}') {
            tok.end = i;
            return tok;

        /**
         * End character for an ARRAY is `}`
         */
        } else if (isType(state, ARRAY) && cur == ']') {
            tok.end = i;
            return tok;

        /**
         * End character for an BRACKETS is `}`
         */
        } else if (isType(state, BRACKETS) && cur == ')') {
            tok.end = i;
            return tok;

        /**
         * While inside of BRACKETS, match an expression inside of the `()`
         */
        } else if (isType(state, BRACKETS) && !isEmptyChar(cur)) {
            const expr = m(EXPRESSION, i, 0);
            i = expr.end;
            tok.end = expr.end;
            tok.expr = expr;
            tok.add(expr);

        /**
         * While inside of an ARRAY, match an EXPRESSION_LIST inside of the `[]`
         */
        } else if (isType(state, ARRAY) && !isEmptyChar(cur)) {
            const values = m(EXPRESSION_LIST, i, 0);
            i = values.end;
            tok.end = values.end;
            tok.add(values);

        /**
         * While inside of an OBJECT, match all OBJECT_PROPERY instances inside
         * of the `{}` brackets.
         */
        } else if (isType(state, OBJECT) && !isEmptyChar(cur)) {
            const property = m(OBJECT_PROPERTY, i, 0);
            i = property.end;
            tok.add(property);

        /**
         * Read the OBJECT_PROPERTY name.
         *
         * { name: value }
         */
        } else if (isType(state, OBJECT_PROPERTY) && !tok.name && !isEmptyChar(cur)) {
            const [ end, name ] = readUntil(str, chars, i, (c) => /[^a-z0-9_]/i.test(c));
            i = end;
            tok.name = name;

        /**
         * If the name is set and we encounter a `:` character, switch to
         * reading the property value. Which is an EXPRESSION.
         */
        } else if (isType(state, OBJECT_PROPERTY) && tok.name && cur == ':') {
            const expr = m(OBJECT_VALUE, i + 1, 0);
            i = tok.end = expr.end;
            tok.expr = expr;
            tok.add(expr);

        /**
         * If we matched the name and value of an OBJECT_PROPERTY and we encounter
         * a `,` or `}` we return back to matching the OBJECT content which
         * will check for more OBJECT_PROPERTY instances.
         */
        } else if (isType(state, OBJECT_PROPERTY) && tok.name && tok.expr && /,|}/.test(cur)) {
            if (cur == ',')
                tok.end = i;
            return tok;
        /**
         * Matches the end of a string, indicated by an unescaped `\"`
         */
        } else if (isType(state, STRING) && cur == '"' && chars[i - 1] != '\\') {
            tok.value = JSON.parse(str.substr(tok.start, i - tok.start + 1));
            tok.end = i;
            return tok;

        /**
         * Detect the operator that the expression statement found.
         */
        } else if (isType(state, OPERATOR) && (/[+\-%/*]/i.test(cur) || ms('++') || ms('--')) ) {
            const longOperator = ms('++') || ms('--');

            if (longOperator) {
                tok.end = i + 1;
                tok.value = str.substr(i, 2);
                return tok;
            }

            tok.end = i;
            tok.value = cur;
            return tok;

        /**
         * Exit matching an EXPRESSION if no valid EXPRESSION was found for
         * the current character.
         */
        } else if (isType(state, EXPRESSION) && !isEmptyChar(cur)) {
            tok.end = i - 1;
            return tok;

        /**
         * Exit matching an EXPRESSIONS if no more valid EXPRESSIONs were
         * found for the current character.
         */
        } else if (isType(state, EXPRESSION_LIST) && !isEmptyChar(cur)) {
            tok.end = i - 1;
            return tok;
        }
    }

    if (isType(state, EXPRESSION))
        return tok;

    if (tok.parent)
        throw new Error(`Failed to parse template in state ${NAMES[state]} at position ${i}`);

    if (state === TEXT)
        tok.add(getLiteral(str, tok, i));

    return tok;
}

module.exports = {
    toAST: (str) => matchToken(str),
    isType,
    TYPES
};
