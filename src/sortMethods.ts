import * as vscode from 'vscode';
import { statSync } from 'fs';
import { getName } from './linkFunctions';

export interface SortMethod {
    (arr: any): Promise<vscode.Uri[] | undefined>;
}

/**
 * Returns an array of links sorted by last modification newest to oldest
 */
export const sortByDateInverse: SortMethod = async (arr: Array<vscode.Uri>) => {
    if (arr) {
        const sorted = arr.sort((a, b) => {
            const astat = statSync(a.fsPath);
            const bstat = statSync(b.fsPath);
            return astat.mtimeMs - bstat.mtimeMs;
        });
        return sorted;
    }
    return undefined;
};

/**
 * Returns an array of links sorted by last modification oldest to newest
 * @param arr array of Uris to be sorted
 */
export const sortByDate: SortMethod = async (arr: Array<vscode.Uri>) => {
    if (arr) {
        const links = await sortByDateInverse(arr);
        if (links) {
            return links.reverse();
        }
    }
    return undefined;
};

/**
 * Returns an array of links sorted a-z
 * @param arr array of Uris to be sorted
 */
export const sortByName: SortMethod = async (arr: Array<vscode.Uri>) => {
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    if (arr) {
        const sorted = arr.sort((a, b) => collator.compare(getName(a), getName(b)));
        if (sorted) {
            return sorted;
        }
    }
    return undefined;
};

/**
 * Returns an array of links sorted z-a
 * @param arr array of Uris to be sorted
 */
export const sortByNameInverse: SortMethod = async (arr: Array<vscode.Uri>) => {
    if (arr) {
        const links = await sortByName(arr);
        if (links) {
            return links.reverse();
        }
    }
    return undefined;
};