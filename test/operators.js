const assert = require('assert');
const { take } = require('./utils');

const { toAST } = require('../src');

describe('toAST', () => {

    describe('# operators', () => {
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

        it('should handle "and" operator', () => {
            const ast = toAST(`
                {% if a and b %}{% endif %}
            `);

            const operator = take(ast, 1, 0, 1);
            const varA = take(ast, 1, 0, 0);
            const varB = take(ast, 1, 0, 2, 0);

            assert.equal(operator.value, 'and');
            assert.equal(operator.type, 'OPERATOR');
            assert.equal(varA.name, 'a');
            assert.equal(varB.name, 'b');
        })

        it('should handle "or" operator', () => {
            const ast = toAST(`
                {% if a or b %}{% endif %}
            `);

            const operator = take(ast, 1, 0, 1);
            const varA = take(ast, 1, 0, 0);
            const varB = take(ast, 1, 0, 2, 0);

            assert.equal(operator.value, 'or');
            assert.equal(operator.type, 'OPERATOR');
            assert.equal(varA.name, 'a');
            assert.equal(varB.name, 'b');
        })

        it('should handle "in" operator', () => {
            const ast = toAST(`
                {% if a in b %}{% endif %}
            `);

            const operator = take(ast, 1, 0, 1);
            const varA = take(ast, 1, 0, 0);
            const varB = take(ast, 1, 0, 2, 0);

            assert.equal(operator.value, 'in');
            assert.equal(operator.type, 'OPERATOR');
            assert.equal(varA.name, 'a');
            assert.equal(varB.name, 'b');
        })

        it('should handle "++" operator', () => {
            const ast = toAST(`
                {% if a++ %}{% endif %}
            `);

            const operator = take(ast, 1, 0, 1);
            const varA = take(ast, 1, 0, 0);

            assert.equal(operator.value, '++');
            assert.equal(operator.type, 'OPERATOR');
            assert.equal(varA.name, 'a');
        })

        it('should handle "--" operator', () => {
            const ast = toAST(`
                {% if a-- %}{% endif %}
            `);

            const operator = take(ast, 1, 0, 1);
            const varA = take(ast, 1, 0, 0);

            assert.equal(operator.value, '--');
            assert.equal(operator.type, 'OPERATOR');
            assert.equal(varA.name, 'a');
        })

        it('should handle "is empty" operator', () => {
            const ast = toAST(`
                {% if a is empty %}{% endif %}
            `);

            const operator = take(ast, 1, 0, 1);
            const varA = take(ast, 1, 0, 0);

            assert.equal(operator.value, 'is empty');
            assert.equal(operator.type, 'OPERATOR');
            assert.equal(varA.name, 'a');
        })

        it('should handle "is not empty" operator', () => {
            const ast = toAST(`
                {% if a is not empty %}{% endif %}
            `);

            const operator = take(ast, 1, 0, 1);
            const varA = take(ast, 1, 0, 0);

            assert.equal(operator.value, 'is not empty');
            assert.equal(operator.type, 'OPERATOR');
            assert.equal(varA.name, 'a');
        })
    })

});
