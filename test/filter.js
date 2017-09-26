const assert = require('assert');
const { take } = require('./utils');

const { toAST } = require('../src');

describe('toAST', () => {

    describe('# filters', () => {
        it('should handle filters', () => {
            const ast = toAST(`
                Hello {{planet|raw}}
            `);

            assert.equal(take(ast, 1, 0, 1, 'name'), 'raw');
        })

        it('should handle filters with arguments', () => {
            const ast = toAST(`
                Hello {{planet|raw("test")}}
            `);

            assert.equal(take(ast, 1, 0, 1, 'name'), 'raw');
            assert.equal(take(ast, 1, 0, 1, 0, 0, 0, 'value'), 'test');
        })
    })

});
