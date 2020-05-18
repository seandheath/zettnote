import { ZCompletionItemProvider } from "./completionProvider";
import { ZDefinitionProvider } from "./definitionProvider";
import { ZTreeView } from "./treeProvider";
import { openLink } from './linkFunctions';
import * as lp from './linkProviders';
import * as sm from './sortMethods';
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

  // Use the console to output diagnostic information (console.log) and errors
  // (console.error) This line of code will only be executed once when your
  // extension is activated
  console.log("Zettnote is now active");
  let noteTree = new ZTreeView('znotes', 'NOTES', lp.getLinksInWorkspace, sm.sortByDate);
  let linkTree = new ZTreeView('zlinks', 'LINKS', lp.getCurrentLinks, sm.sortText);
  let backlinkTree = new ZTreeView('zbacklinks', 'BACKLINKS', lp.getCurrentBacklinks, sm.sortByDate);

  const md = { scheme: "file", language: "markdown" };
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(md, new ZCompletionItemProvider(), '['),
    vscode.languages.registerDefinitionProvider(md, new ZDefinitionProvider())
  );


  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let openLinkCom = vscode.commands.registerCommand("zettnote.openLink",
    (link: string) => { openLink(link) });
  context.subscriptions.push(openLinkCom);

  let refreshLinks = () => {
    noteTree.refresh();
    linkTree.refresh();
    backlinkTree.refresh();
  };
  vscode.workspace.onDidChangeTextDocument(refreshLinks);
  vscode.window.onDidChangeActiveTextEditor(refreshLinks);
}

// this method is called when your extension is deactivated
export function deactivate() { }
