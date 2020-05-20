import vscode = require('vscode');

import { getLinksInWorkspace } from './linkProviders';
import * as sm from './sortMethods';
import { getName } from './linkFunctions';

/**
 * Provides the dropdown completion list containing all the links in the workspace when you start
 * writing a link using `[[`.
 */
export class ZCompletionItemProvider implements vscode.CompletionItemProvider {

    constructor() {
    }

    async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
        let linePrefix = document.lineAt(position).text.substr(0, position.character);
        if (!linePrefix.endsWith('[[')) {
            return undefined;
        }
        var links = await getLinksInWorkspace(sm.sortByName);
        var names = links?.map(l => getName(l));
        if (names) {
            var items = names.map((name) => {
                var kind = vscode.CompletionItemKind.File;
                var label = name;
                var item = new vscode.CompletionItem(label, kind);
                return item;
            });
            return items;
        }
        return undefined;
    }
}