import { writeFileSync } from "fs";
import { basename } from "path";
import { getLinksInWorkspace } from "./linkProviders";
import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as sm from './sortMethods';

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
}

/**
 * Returns an array of Uris for all the markdown files in the current workspace
 */
export async function getWorkspaceFiles() {
    return vscode.workspace.findFiles("**/" + FILE_GLOB).then((files) => {
        return files.filter((file) => file.scheme === "file");
    });
}


class LinkItem implements vscode.QuickPickItem {
    label: string;
    constructor(label: string) {
        this.label = label;
    }
}

export async function createNote() {
    const noteName = await pickNote();
    if (noteName) {
        openLink(noteName);
    }
}

async function pickNote() {
    const links = await getLinksInWorkspace(sm.sortByDate);
    const disposables: vscode.Disposable[] = [];
    if (links) {
        const items = links.map(i => new LinkItem(i));
        try {
            return await new Promise<string | undefined>((resolve, reject) => {
                const input = vscode.window.createQuickPick<LinkItem>();
                input.placeholder = 'Type link name';
                input.items = items;
                disposables.push(
                    input.onDidChangeValue(value => {
                        if (!value) {
                            input.items = items;
                            return;
                        }
                        input.items = [new LinkItem(value)].concat(items);
                    }),
                    input.onDidChangeSelection(items => {
                        const item = items[0];
                        resolve(item.label);
                        input.hide();
                    }),
                    input.onDidHide(() => {
                        resolve(undefined);
                        input.dispose();
                    })
                );
                input.show();
            });
        } finally {
            disposables.forEach(d => d.dispose());
        }

    }
}