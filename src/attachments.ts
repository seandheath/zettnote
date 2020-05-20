import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

const open = require('open');

const MD_LINK_REGEX = /\[[^\]]*\]\(([^\)]*)?\)/g;

export async function openAttachment() {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const range = editor.document.getWordRangeAtPosition(editor.selection.active, MD_LINK_REGEX);
        if (range && range.isSingleLine) {
            const line = editor.document.lineAt(range.start.line);
            const fullLink = line.text.slice(range.start.character, range.end.character);
            const match = MD_LINK_REGEX.exec(fullLink);
            if (match && match[1]) {
                const fileName = path.basename(match[1]);
                const filePath = getAttachmentFolder();
                const fullPath = path.join(filePath, fileName);
                try {
                    fs.accessSync(fullPath, fs.constants.R_OK);
                    open(fullPath);
                } catch (err) {
                    vscode.window.showErrorMessage("Failed to open attachment, ensure the link you are trying to open is a file in your attachments folder - " + err);
                }
            }
        }
    }
    return undefined;
}

function getAttachmentFolder() {
    const config = vscode.workspace.getConfiguration('zettnote.attachments');
    var rootPath = '';

    if (config.folderType === "absolute") {
        return config.path;
    } else if (config.folderType === "relative to workspace") {
        if (vscode.workspace.workspaceFolders) {
            rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        } else {
            throw new Error("Workspace root undefined - do you have a folder open?");
        }
    } else if (config.folderType === "relative to note") {
        const openFile = vscode.window.activeTextEditor?.document.uri;
        if (openFile) {
            rootPath = path.dirname(openFile.fsPath);
        } else {
            throw new Error("Unable to find the open file on the file system.");
        }
    }
    const fullPath = path.join(rootPath, config.path);
    try {
        fs.accessSync(fullPath);
    } catch (err) {
        if (err.code === "ENOENT") {
            // The folder doesn't exist - let's create it!
            fs.mkdirSync(fullPath);
        } else {
            throw err;
        }
    }
    return fullPath;
}

function insertFileLinks(files: vscode.Uri[], destination: string) {
    var prefix = '';
    if (files.length > 1) {
        prefix = '\n';
    }

    var snip = new vscode.SnippetString(prefix);
    const notePath = vscode.window.activeTextEditor?.document.uri.fsPath;
    if (notePath) {
        const noteDir = path.dirname(notePath);
        files.forEach(file => {
            const attachmentName = path.basename(file.fsPath);
            const targetPath = path.relative(noteDir, destination);
            const target = path.join(targetPath, attachmentName);
            snip.appendText(`${prefix}[${attachmentName}](${target})`);
        });
        vscode.window.activeTextEditor?.insertSnippet(snip);
    } else {
        throw new Error("Failed to insert link text");
    }




}

export async function attachFile() {

    try {
        const destination = getAttachmentFolder();
        fs.accessSync(destination, fs.constants.W_OK);
        const files = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: true,
            openLabel: 'Attach'
        });
        if (files) {
            files.map(file => {
                // Make sure we can read the target file
                fs.accessSync(file.fsPath, fs.constants.R_OK);

                // Create the destination path + filename
                const newDest = path.join(destination, path.basename(file.fsPath));

                // start the async file copy, throw error on error
                fs.copyFile(file.fsPath, newDest, (err) => {
                    if (err) {
                        throw err;
                    }
                });
            });

            // Insert file links into the page. If there are multiple links will insert newlines before each link.
            insertFileLinks(files, destination);
        }
    } catch (err) {
        vscode.window.showErrorMessage("Failed to attach files - " + err);
    }

    return;
}

