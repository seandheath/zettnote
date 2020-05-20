import * as fs from 'fs';
import * as vscode from 'vscode';
export async function attachFile(destination: string) {

    try {
        const stats = fs.accessSync(destination, fs.constants.W_OK);
        const files = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: true,
            openLabel: 'Attach'
        });

        files?.map(file => {
            fs.copyFile(file.fsPath, destination, (err) => {
                vscode.window.showErrorMessage("Failed to copy file: " + file.fsPath + " to " + destination + "\nError: " + err);
            });
        });
    } catch (err) {
        vscode.window.showErrorMessage("Failed to attach files, please check folder permissions");
    }
    return;
}

