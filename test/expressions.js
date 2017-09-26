const assert = require('assert');
const { take } = require('./utils');

const { toAST } = require('../src');

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
    })

});
