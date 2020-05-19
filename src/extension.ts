import { ZCompletionItemProvider } from "./completionProvider";
import { ZDefinitionProvider } from "./definitionProvider";
import { ZTreeView } from "./treeProvider";
import { createNote, openLink } from './linkFunctions';
import * as lp from './linkProviders';
import * as sm from './sortMethods';
import * as vscode from 'vscode';
import { createContext } from "vm";

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
  let createNoteCom = vscode.commands.registerCommand("zettnote.createNote", createNote);
  let openLinkCom = vscode.commands.registerCommand("zettnote.openLink", openLink);
  let noteSortOrderCom = vscode.commands.registerCommand("zettnote.noteSortOrder", noteTree.toggleSortOrder);
  let linkSortOrderCom = vscode.commands.registerCommand("zettnote.linkSortOrder", linkTree.toggleSortOrder);
  let backlinkSortOrder = vscode.commands.registerCommand("zettnote.backlinkSortOrder", backlinkTree.toggleSortOrder);
  let noteSortTypeCom = vscode.commands.registerCommand("zettnote.noteSortType", noteTree.toggleSortType);
  let linkSortTypeCom = vscode.commands.registerCommand("zettnote.linkSortType", linkTree.toggleSortType);
  let backlinkSortTypeCom = vscode.commands.registerCommand("zettnote.backlinkSortType", backlinkTree.toggleSortType);
  context.subscriptions.push(createNoteCom);
  context.subscriptions.push(openLinkCom);
  context.subscriptions.push(noteSortOrderCom);
  context.subscriptions.push(linkSortOrderCom);
  context.subscriptions.push(backlinkSortOrder);
  context.subscriptions.push(noteSortTypeCom);
  context.subscriptions.push(linkSortTypeCom);
  context.subscriptions.push(backlinkSortTypeCom);

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
