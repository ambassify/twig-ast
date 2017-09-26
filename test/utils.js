function take(ast, ...path) {
    let node = ast;
    while (node && node.children && path.length > 0) {
        const id = path.shift();

        if (typeof id === 'number')
            node = node.children[id];
        else
            return node[id];
    }

    return node;
}

module.exports = { take };
