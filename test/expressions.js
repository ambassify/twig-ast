const assert = require('assert');
const { take } = require('./utils');

const { toAST } = require('../src');
const { print } = require('../src/print');

describe('toAST', () => {

    describe('# expressions', () => {
        it('should handle regular operators', () => {
            const ast = toAST(`
                Hello {{planet + (10 - hello_world)}}
            `);

            assert.equal(take(ast, 1, 0, 1, 'value'), '+');
            assert.equal(take(ast, 1, 0, 2, 0, 0, 1, 'value'), '-');
            assert.equal(take(ast, 1, 0, 2, 0, 'type'), 'BRACKETS');
        })

        it('should handle unary operators', () => {
            const ast = toAST(`
                Hello {{planet++}}
            `);

            const operator = take(ast, 1, 0, 1, 'value');

            assert.equal(operator, '++');
        })

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
    })

});
