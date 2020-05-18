import * as vscode from 'vscode';
import { statSync } from 'fs';
import { getName } from './linkFunctions';

export type SortMethod = (arr: any) => string[];

/**
 * Returns an array of links sorted by last modification newest to oldest
 */
export function sortByDate(arr: Array<vscode.Uri>) {
    return arr.sort((a, b) => {
        const astat = statSync(a.fsPath);
        const bstat = statSync(b.fsPath);
        return astat.mtime.getDate() - bstat.mtime.getDate();
    }).map(i => getName(i));
}

/**
 * Returns an array of links sorted by last modification oldest to newest
 * @param arr array of Uris to be sorted
 */
export function sortByDateInverse(arr: Array<vscode.Uri>) {
    return sortByDate(arr).reverse();
}

/**
 * Returns an array of links sorted a-z
 * @param arr array of Uris to be sorted
 */
export function sortByName(arr: Array<vscode.Uri>) {
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    const names = arr.map(i => getName(i));
    return sortText(names);
}

/**
 * Returns an array of links sorted z-a
 * @param arr array of Uris to be sorted
 */
export function sortByNameInverse(arr: Array<vscode.Uri>) {
    return sortByName(arr).reverse();
}

/**
 * Returns an array of links sorted a-z
 * @param arr array of Uris to be sorted
 */
export function sortText(arr: Array<string>) {
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    return arr.sort((a, b) => collator.compare(a, b));
}