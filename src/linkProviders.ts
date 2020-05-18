import * as vscode from 'vscode';
import { getWorkspaceFiles, getName, getFilesFromLinks } from './linkFunctions';
import { SortMethod, sortText } from './sortMethods';

export type LinkProvider = (sm: SortMethod) => Promise<string[] | undefined>;

export const LINK_REGEX = /(\[\[[\w\-. ]+\]\])+?/gi;

/**
 * Returns a set of all the link names in the workspace
 */
export const getLinksInWorkspace: LinkProvider = async (sm: SortMethod) => {
    const allFiles = await getWorkspaceFiles();
    const names = sm(allFiles);
    if (names) {
        return names;
    }
    return undefined;
};

/**
 * Returns a Set of all the backlinks that link to the current file in the current workspace or undefined if none
 */
export const getCurrentBacklinks: LinkProvider = async (sm: SortMethod) => {
    const openFile = vscode.window.activeTextEditor?.document.uri;
    if (openFile) {
        const fileName = getName(openFile);
        const files = await getWorkspaceFiles();
        const backlinks = await asyncFileFilter(files, async (f: vscode.Uri) => {
            const contents = await vscode.workspace.fs.readFile(f);
            return contents.toString().includes("[[" + fileName + "]]");
        });
        return sm(backlinks);
    }
    return undefined;
};

/**
 * Returns a set of all links in the active file
 */
export const getCurrentLinks: LinkProvider = async (sm: SortMethod) => {
    const openFile = vscode.window.activeTextEditor?.document.uri;
    if (openFile) {
        const links = await getLinks(openFile, sm);
        if (links) {
            //const files = await getFilesFromLinks(links);
            return sm(links);
        }
    }
    return undefined;
};

/**
 * Allows asynchronous filtering of an array of Uris
 * @param arr Array of Uris to filter
 * @param predicate Filter function to apply
 */
async function asyncFileFilter(arr: Array<vscode.Uri>, predicate: any) {
    const results = await Promise.all(arr.map(predicate));
    return arr.filter((v: any, index: any) => results[index]);
}


/**
 * Returns a set of all the links in the given file or undefined if none
 * @param file Uri for the file you want to get links from
 */
async function getLinks(file: vscode.Uri, sm: SortMethod): Promise<string[] | undefined> {
    const contents = await vscode.workspace.fs.readFile(file);
    const matches = contents.toString().match(LINK_REGEX);
    if (matches) {
        const links = matches.map((match) => match.slice(2, -2));
        //const uris = await getFilesFromLinks(links);
        //return sm(uris).map(i => getName(i));
        return sortText(links);
    }
    return undefined;
}
