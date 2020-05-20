import * as vscode from 'vscode';
import * as lp from './linkProviders';
import * as sm from './sortMethods';
import { getName } from './linkFunctions';


/**
 * Creates each item in the tree and sets the click command to open the associated link
 */
class ZLink extends vscode.TreeItem {
    constructor(link: vscode.Uri) {
        const label = getName(link);
        super(label, vscode.TreeItemCollapsibleState.None);
        this.command = {
            command: "zettnote.openLink",
            title: "Open Link",
            arguments: [label]
        };
        this.resourceUri = link;
        this.description = true;
        this.label = label;
    }
}

export class ZTreeView {
    private view: vscode.TreeView<ZLink>;
    private data: ZTreeProvider;
    private title: string;

    constructor(id: string, name: string, linkProvider: lp.LinkProvider, sortMethod: sm.SortMethod) {
        this.data = new ZTreeProvider(this, linkProvider, sortMethod);
        this.view = vscode.window.createTreeView(id, { treeDataProvider: this.data });
        this.title = name;
    }

    refresh() {
        this.data.refresh();
    }

    setLinkNumber(num: number) {
        this.view.title = this.title + (num ? " - " + num : "");
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
    private container: ZTreeView;

    constructor(container: ZTreeView, linkProvider: lp.LinkProvider, sortMethod: sm.SortMethod) {
        this.linkProvider = linkProvider;
        this.sortMethod = sortMethod;
        this.count = 0;
        this.container = container;
    }

    setSortMethod(sm: sm.SortMethod) {
        this.sortMethod = sm;
        this.refresh();
    }

    setCount(num: number) {
        this.count = num;
        this.container.setLinkNumber(this.count);
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
                this.setCount(links.length);
                const zLinks = links.map((link) => {
                    return new ZLink(link);
                });
                return Promise.resolve(zLinks);
            } else {
                this.setCount(0);
                return undefined;
            }
        }
    }

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }
}