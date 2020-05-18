import * as vscode from 'vscode';
import * as lp from './linkProviders';
import * as sm from './sortMethods';


/**
 * Creates each item in the tree and sets the click command to open the associated link
 */
class ZLink extends vscode.TreeItem {
    constructor(s: string) {
        super(s, vscode.TreeItemCollapsibleState.None);
        this.command = {
            command: "zettnote.openLink",
            title: "Open Link",
            arguments: [s]
        };
    }
}

export class ZTreeView {
    private view: vscode.TreeView<ZLink>;
    private data: ZTreeProvider;
    private title: string;

    constructor(id: string, name: string, linkProvider: lp.LinkProvider, sortMethod: sm.SortMethod) {
        this.data = new ZTreeProvider(linkProvider, sortMethod);
        this.view = vscode.window.createTreeView(id, { treeDataProvider: this.data });
        this.title = name;
    }

    refresh() {
        this.data.refresh();
        this.view.title = this.title + " [" + this.data.getCount() + "]";
    }
}

/**
 * Provides items to the zettnote tree view. Does not work hierarchically - a list of links is all it provides
 */
class ZTreeProvider implements vscode.TreeDataProvider<ZLink> {
    private _onDidChangeTreeData: vscode.EventEmitter<ZLink | undefined> = new vscode.EventEmitter<ZLink | undefined>();
    readonly onDidChangeTreeData: vscode.Event<ZLink | undefined> = this._onDidChangeTreeData.event;
    private linkProvider: lp.LinkProvider;
    private sortMethod: sm.SortMethod;
    private count: number;

    constructor(linkProvider: lp.LinkProvider, sortMethod: sm.SortMethod) {
        this.linkProvider = linkProvider;
        this.sortMethod = sortMethod;
        this.count = 0;
    }

    setSortMethod(sm: sm.SortMethod) {
        this.sortMethod = sm;
        this.refresh();
    }

    getCount() {
        return this.count;
    }

    getTreeItem(link: ZLink) {
        return link;
    }

    /**
     * Implements the required function for the tree to work - only handles the root node case.
     * @param link unused because I don't implement a hierarchy
     */
    async getChildren(link?: ZLink) {
        if (link) {
            return undefined;
        } else {
            // this is the root case
            //const links = Array.from(this.linkProvider());
            const links = await this.linkProvider(this.sortMethod);
            if (links) {
                this.count = links.length;
                const zLinks = links.map((link) => {
                    return new ZLink(link);
                });
                return Promise.resolve(zLinks);
            } else {
                return undefined;
            }
        }
    }

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }
}