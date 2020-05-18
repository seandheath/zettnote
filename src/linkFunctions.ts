import { writeFileSync } from "fs";
import { basename } from "path";
import * as vscode from 'vscode';

const FILE_GLOB = "*.{md,markdown}";

/**
 * Gets a link name from a file Uri
 * @param u Uri for the file you want to get the name of
 */
export function getName(u: vscode.Uri): string {
    return basename(u.fsPath, "." + u.fsPath.split(".").pop());
}

/**
 * Retrieves the first Uri that matches the provided link string 
 * @param link link string to retrieve
 */
export async function getFileFromLink(link: string): Promise<vscode.Uri> {
    const allFiles = await getWorkspaceFiles();
    const linkedFiles = Array.from(allFiles.filter((f) => {
        return getName(f) === link;
    }));
    // TODO: some error checking here
    return linkedFiles[0];
}

/**
 * Retrieves the first Uri that matches the provided link string 
 * @param link link string to retrieve
 */
export async function getFilesFromLinks(links: string[]) {
    const allFiles = await getWorkspaceFiles();
    const setLinks = new Set(links);
    const linkedFiles = Array.from(allFiles.filter((f) => {
        return setLinks.has(getName(f));
    }));
    // TODO: some error checking here
    return linkedFiles;
}

/**
 * Creates a file for the given link name, adds a markdown header with the link name in the file, and returns the Uri.
 * @param link Link name to make the file from
 */
export function newNote(link: string) {
    const fileName = vscode.workspace.rootPath + `/${link}.md`;
    const contents = `# ${link}`;
    writeFileSync(fileName, contents);
    return vscode.Uri.file(fileName);
}

/**
 * Opens the file corresponding to the provided link
 * @param link Link to open
 */
export async function openLink(link: string) {
    var file = await getFileFromLink(link);
    if (!file) {
        file = newNote(link);
    }
    vscode.window.showTextDocument(file);
    //vscode.commands.executeCommand('vscode.open', file);
    //vscode.workspace.openTextDocument(file);
}

/**
 * Returns an array of Uris for all the markdown files in the current workspace
 */
export async function getWorkspaceFiles() {
    return vscode.workspace.findFiles("**/" + FILE_GLOB).then((files) => {
        return files.filter((file) => file.scheme === "file");
    });
}

