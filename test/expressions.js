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
    })

});
