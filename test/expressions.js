const assert = require('assert');
const { take } = require('./utils');

const { toAST } = require('../src');

describe('toAST', () => {

    describe('# expressions', () => {
        // eslint-disable-next-line
        it('should handle single quote strings', () => {
            const ast = toAST(`
                {% if foo('bar') %}{% endif %}
            `);

            const string = take(ast, 1, 0, 0, 0, 0, 0);

            assert.equal(string.value, 'bar');
            assert.equal(string.type, 'STRING');
            assert.equal(string.quote, '\'');
        })

        it('should handle double quote strings', () => {
            const ast = toAST(`
                {% if foo("bar") %}{% endif %}
            `);

            const string = take(ast, 1, 0, 0, 0, 0, 0);

            assert.equal(string.value, 'bar');
            assert.equal(string.type, 'STRING');
            assert.equal(string.quote, '"');
        })

        it('should handle strings as object keys', () => {
            const ast = toAST(`
                {% set a = { "hello": "world" } %}
            `);

            assert.equal(take(ast, 1, 0, 2, 0, 0, 'name'), 'hello');
        })

        it('should handle function call without arguments', () => {
            const ast = toAST(`
                {{ foo() }}
            `);

            const fn = take(ast, 1, 0, 0);

            assert.equal(fn.name, 'foo');
            assert.equal(fn.match, 'foo()');
        });

        it('should handle function call without arguments and chained properties', () => {
            const ast = toAST(`
                {{ foo().bar.test }}
            `);

            const fn = take(ast, 1, 0, 0);

            assert.equal(fn.name, 'foo');
            assert.equal(fn.match, 'foo()');
        });

        it('should handle function call without arguments and chained methods', () => {
            const ast = toAST(`
                {{ foo().bar('baz') }}
            `);

            const fn = take(ast, 1, 0, 0);

            assert.equal(fn.name, 'foo');
            assert.equal(fn.match, 'foo()');

            const fnBar = take(ast, 1, 0, 1);
            assert.equal(fnBar.name, 'bar');
            assert.equal(take(fnBar, 0, 0, 0, 'value'), 'baz');
        });

        describe('# regression', () => {

            it('should handle functions starting with in', () => {
                const ast = toAST('{{include(template_from_string("test"))}}');

                assert.equal(take(ast, 1, 0, 0, 'name'), 'include');
                assert.equal(take(ast, 1, 0, 0, 0, 0, 0, 'name'), 'template_from_string');
            });

        })
    })

});
