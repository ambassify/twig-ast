const assert = require('assert');
const { take } = require('./utils');

const { toAST } = require('../src');

describe('toAST', () => {

    describe('# output tags', () => {

        it('should throw on partial output tags', () => {
            assert.throws(() => {
                toAST('{{variable}');
            });
        })

        it('should error on incomplete output tags', () => {
            const ast = toAST('{{variable}', { throwSyntaxErrors: false });

            const tag = take(ast, 1);

            assert(tag);
            assert.strictEqual(typeof tag.end, 'undefined');
            assert.equal(tag.type, 'TAG_OUTPUT');
            assert.equal(take(tag, 0, 0, 'name'), 'variable');
        })
    })

});
