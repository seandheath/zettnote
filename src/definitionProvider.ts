import * as vscode from 'vscode';
import { getFileFromLink, newNote } from "./linkFunctions";
import { LINK_REGEX } from './linkProviders';

/**
 * Allows you to follow a link and open the file or create a new file if it doesn't exist.
 */
export class ZDefinitionProvider implements vscode.DefinitionProvider {

    constructor() {
    }

    async provideDefinition(document: vscode.TextDocument, position: vscode.Position) {
        var range = document.getWordRangeAtPosition(position, LINK_REGEX);
        if (range) {
            // The character position is within the tag
            const link = document.lineAt(position).text.slice(range.start.character + 2, range.end.character - 2);
            var uri = await getFileFromLink(link);
            if (!uri) {
                uri = newNote(link);
            }
            return new vscode.Location(uri, new vscode.Position(0, 0));
        } else {
            return undefined;
        }
    }
}