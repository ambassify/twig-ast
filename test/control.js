const assert = require('assert');
const { take } = require('./utils');

const { toAST } = require('../src');

describe('toAST', () => {

    describe('# control tags', () => {
        it('should handle if statements', () => {
            const ast = toAST(`
                Hello {% if isUser %}User{% endif %}
            `);

            assert.equal(take(ast, 1, 'name'), 'if');
            assert.equal(take(ast, 1, 0, 0, 'name'), 'isUser');
            assert.equal(take(ast, 1, 1, 0, 'value'), 'User');
        })

        it('should handle self closing statements', () => {
            const ast = toAST(`
                Hello {% set username = "JorgenEvens" %}
            `);

            assert.equal(take(ast, 1, 'name'), 'set');
            assert.strictEqual(take(ast, 1, 'closing'), undefined);
            assert.equal(take(ast, 1, 0, 2, 0, 'value'), 'JorgenEvens');
        })

        it('should handle else / elseif statements', () => {
            const ast = toAST(`
                {% if isUser %}
                    Hello User
                {% elseif isVisitor %}
                    Hello Visitor
                {% else %}
                    Hello Anonymous
                {% endif %}
            `);

            assert.equal(take(ast, 1, 'name'), 'if');
            assert.equal(take(ast, 1, 0, 0, 'name'), 'isUser');
            assert.equal(take(ast, 1, 1, 0, 'value').trim(), 'Hello User');
            assert.equal(take(ast, 1, 2, 'name'), 'elseif');
            assert.equal(take(ast, 1, 2, 0, 0, 'name'), 'isVisitor');
            assert.equal(take(ast, 1, 2, 1, 0, 'value').trim(), 'Hello Visitor');
            assert.equal(take(ast, 1, 3, 'name'), 'else');
            assert.equal(take(ast, 1, 3, 0, 0, 'value').trim(), 'Hello Anonymous');
        })

    })

    it('should handle for loop iterating both keys and values', () => {
        const ast = toAST(`
            {% for key, value in array %}
                Hello Test
            {% endfor %}
        `);

        assert.equal(take(ast, 1, 'name'), 'for');
        assert.equal(take(ast, 1, 0, 0, 'name'), 'key');
        assert.equal(take(ast, 1, 1, 0, 'name'), 'value');
        assert.equal(take(ast, 1, 1, 1, 'value'), 'in');
        assert.equal(take(ast, 1, 1, 2, 0, 'name'), 'array');
        assert.equal(take(ast, 1, 2, 'type'), 'BLOCK');
    });

    it('should handle missing spaces in TAG_CONTROL', () => {
        /* eslint-disable */
        const ast = toAST(`
            {%if fb%}
            {%set connection = "Facebook account"%}
            {%else%}
            {%set connection = email ~ " email account"%}
            {%endif%}
        `, { throwSyntaxErrors: false });
        /* eslint-enable */

        const ifTag = take(ast, 1);
        const end = take(ifTag, 1, 'start');
        const tag = ast.source.substring(ifTag.start, end);

        assert.equal(take(ifTag, 'name'), 'if');
        assert.equal(take(ifTag, 'end'), 174);
        assert.equal(tag, '{%if fb%}');
        assert.equal(take(ifTag, 1, 'type'), 'BLOCK');
    });

});
