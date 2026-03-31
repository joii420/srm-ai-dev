"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PeekOverlayExpressionIdentifier = void 0;
const acorn_1 = require("acorn");
const acorn_walk_1 = require("acorn-walk");
const ast_1 = require("../constants/ast");
const utils_1 = require("./utils");
class PeekOverlayExpressionIdentifier {
    constructor(options, script) {
        this.options = options;
        if (script)
            this.updateScript(script);
    }
    hasParsedScript() {
        return !!this.parsedScript;
    }
    updateScript(script) {
        try {
            this.parsedScript = (0, acorn_1.parse)(script, {
                ecmaVersion: ast_1.ECMA_VERSION,
                sourceType: this.options.sourceType,
            });
        }
        catch (e) {
            // eslint-disable-next-line no-console
            console.error(e);
        }
    }
    clearScript() {
        this.parsedScript = undefined;
    }
    async extractExpressionAtPosition(pos) {
        return new Promise((resolve, reject) => {
            if (!this.parsedScript) {
                throw "PeekOverlayExpressionIdentifier - No valid script found";
            }
            let nodeFound;
            (0, acorn_walk_1.simple)(this.parsedScript, {
                MemberExpression(node) {
                    if (!nodeFound && (0, utils_1.isPositionWithinNode)(node, pos)) {
                        nodeFound = node;
                    }
                },
                ExpressionStatement(node) {
                    if (!nodeFound && (0, utils_1.isPositionWithinNode)(node, pos)) {
                        nodeFound = node;
                    }
                },
            });
            if (nodeFound) {
                const expressionFound = (0, utils_1.getExpressionStringAtPos)(nodeFound, pos, this.options);
                if (expressionFound) {
                    resolve(expressionFound);
                }
                else {
                    reject("PeekOverlayExpressionIdentifier - No expression found at position");
                }
            }
            reject("PeekOverlayExpressionIdentifier - No node found");
        });
    }
}
exports.PeekOverlayExpressionIdentifier = PeekOverlayExpressionIdentifier;
//# sourceMappingURL=index.js.map