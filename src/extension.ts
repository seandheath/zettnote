// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { existsSync, readFile, writeFileSync, link, linkSync } from "fs";
import { basename, dirname, join, normalize, relative, resolve } from "path";
import { getEnabledCategories } from "trace_events";
import { downloadAndUnzipVSCode } from "vscode-test";
import vscode = require('vscode');

const FILE_GLOB = "*.{md,markdown}";
const LINK_REGEX = /(\[\[[\w\-. ]+\]\])+?/gi;

function getName(u: vscode.Uri) {
  return basename(u.fsPath, "." + u.fsPath.split(".").pop());
}

async function getFilesFromLinks(links: Set<string>) {
  const allFiles = await getWorkspaceFiles();
  const linkedFiles = Array.from(allFiles).filter((f) => {
    return links.has(getName(f));
  });
  return linkedFiles;
}

async function getFileFromLink(link: string) {
  const allFiles = await getWorkspaceFiles();
  const linkedFiles = Array.from(allFiles.filter((f) => {
    return getName(f) == link;
  }));
  return linkedFiles[0];

}

async function getAllLinks() {
  const allFiles = await getWorkspaceFiles();
  return allFiles.map((file) => getName(file));
}

async function getLinks(file: vscode.Uri) {
  const contents = await vscode.workspace.fs.readFile(file);
  const matches = contents.toString().match(LINK_REGEX);
  if (matches) {
    const links = matches.map((match) => match.slice(2, -2));
    return new Set(links);
  }
  return undefined;
}

async function getWorkspaceFiles() {
  return vscode.workspace.findFiles("**/" + FILE_GLOB).then((files) => {
    return files.filter((file) => file.scheme === "file");
  });
}

class ZCompletionItemProvider implements vscode.CompletionItemProvider {

  constructor() {
  }

  async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
    let linePrefix = document.lineAt(position).text.substr(0, position.character);
    if (!linePrefix.endsWith('[[')) {
      return undefined;
    }
    var names = await getAllLinks();
    var items = names.map((name) => {
      var kind = vscode.CompletionItemKind.File;
      var label = name;
      var item = new vscode.CompletionItem(label, kind);
      return item;
    });
    return items;
  }
}

class ZDefinitionProvider implements vscode.DefinitionProvider {

  constructor() {
  }

  async provideDefinition(document: vscode.TextDocument, position: vscode.Position) {
    var range = document.getWordRangeAtPosition(position, LINK_REGEX);
    if (range) {
      // The character position is within the tag
      const link = document.lineAt(position).text.slice(range.start.character + 2, range.end.character - 2);
      const uri = await getFileFromLink(link);
      if (uri) {
        return new vscode.Location(uri, new vscode.Position(0, 0));
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  }
}

async function asyncFileFilter(arr: Array<vscode.Uri>, predicate: any) {
  const results = await Promise.all(arr.map(predicate));
  return arr.filter((v: any, index: any) => results[index]);
}

async function getCurrentBacklinks() {
  const openFile = vscode.window.activeTextEditor?.document.uri;
  if (openFile) {
    const fileName = getName(openFile);
    const files = await getWorkspaceFiles();
    const backlinks = await asyncFileFilter(files, async (f: vscode.Uri) => {
      const contents = await vscode.workspace.fs.readFile(f);
      return contents.toString().includes("[[" + fileName + "]]");
    });
    return new Set(backlinks.map((link) => getName(link)));
  }
  return undefined;
}

async function getCurrentLinks() {
  const openFile = vscode.window.activeTextEditor?.document.uri;
  if (openFile) {
    const links = await getLinks(openFile);
    if (links) {
      //const files = await getFilesFromLinks(links);
      return new Set(links);
    }
  }
  return undefined;
}

class ZLink extends vscode.TreeItem {
  constructor(s: string) {
    super(s, vscode.TreeItemCollapsibleState.None);
  }
}
interface LinkProvider {
  (): Promise<Set<string> | undefined>;
}
class ZTreeProvider implements vscode.TreeDataProvider<ZLink> {
  private _onDidChangeTreeData: vscode.EventEmitter<ZLink | undefined> = new vscode.EventEmitter<ZLink | undefined>();
  readonly onDidChangeTreeData: vscode.Event<ZLink | undefined> = this._onDidChangeTreeData.event;
  private linkProvider: LinkProvider;

  constructor(lp: LinkProvider) {
    this.linkProvider = lp;
  }

  getTreeItem(link: ZLink) {
    return link;
  }

  async getChildren(link?: ZLink) {
    if (link) {
      return undefined;
    } else {
      // this is the root case
      //const links = Array.from(this.linkProvider());
      const links = await this.linkProvider();
      if (links) {
        const arrayLinks = Array.from(links);
        return Promise.resolve(arrayLinks.map((link) => new ZLink(link)));
      } else {
        return undefined;
      }
    }
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

  // Use the console to output diagnostic information (console.log) and errors
  // (console.error) This line of code will only be executed once when your
  // extension is activated
  console.log("Zettnote is now active");
  let linkTree = new ZTreeProvider(getCurrentLinks);
  let backlinkTree = new ZTreeProvider(getCurrentBacklinks);

  vscode.window.registerTreeDataProvider('ZLinks', linkTree);
  vscode.window.registerTreeDataProvider('ZBacklinks', backlinkTree);
  let refreshLinks = () => {
    linkTree.refresh();
    backlinkTree.refresh();
  }

  const md = { scheme: "file", language: "markdown" };
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(md, new ZCompletionItemProvider(), '['),
    vscode.languages.registerDefinitionProvider(md, new ZDefinitionProvider())
  );


  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let updateTreeViewsCom = vscode.commands.registerCommand("zettnote.updateTreeViews", refreshLinks);
  let getLinksCom = vscode.commands.registerCommand("zettnote.getLinks", () => getCurrentLinks());
  let getBacklinksCom = vscode.commands.registerCommand(
    "zettnote.getBacklinks", () => getCurrentBacklinks());
  context.subscriptions.push(updateTreeViewsCom);
  context.subscriptions.push(getLinksCom);
  context.subscriptions.push(getBacklinksCom);

  vscode.workspace.onDidChangeTextDocument(refreshLinks);
  vscode.window.onDidChangeActiveTextEditor(refreshLinks);
}

// this method is called when your extension is deactivated
export function deactivate() { }
