const assert = require('assert');
const { take } = require('./utils');
const { print } = require('../src/print');

const { toAST } = require('../src');

describe('toAST', () => {

    describe('# control tags', () => {
        it('should handle if statements', () => {
            const ast = toAST(`
                Hello {% if isUser %}User{% endif %}
            `);

            print(ast);
            assert.equal(take(ast, 1, 'name'), 'if');
            assert.equal(take(ast, 1, 0, 0, 'name'), 'isUser');
            assert.equal(take(ast, 1, 1, 0, 'value'), 'User');
        })

        it('should handle self closing statements', () => {
            const ast = toAST(`
                Hello {% set username = "JorgenEvens" %}
            `);

            print(ast);
            assert.equal(take(ast, 1, 'name'), 'set');
            assert.strictEqual(take(ast, 1, 'closing'), undefined);
            assert.equal(take(ast, 1, 0, 2, 0, 'value'), 'JorgenEvens');
        })

    })

});
