import { ZCompletionItemProvider } from "./completionProvider";
import { ZDefinitionProvider } from "./definitionProvider";
import { ZTreeView } from "./treeProvider";
import { createNote, openLink } from './linkFunctions';
import { attachFile, openAttachment } from './attachments';
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
  let viewConfig = vscode.workspace.getConfiguration("zettnote.views");
  if (viewConfig.enableNotes) {
    let noteTree = new ZTreeView('znotes', 'NOTES', lp.getLinksInWorkspace, sm.sortByDate);
    //vscode.workspace.onDidChangeTextDocument(noteTree.refresh);
    vscode.window.onDidChangeActiveTextEditor(noteTree.refresh);
  }
  if (viewConfig.enableLinks) {
    let linkTree = new ZTreeView('zlinks', 'LINKS', lp.getCurrentLinks, sm.sortByName);
    //vscode.workspace.onDidChangeTextDocument(linkTree.refresh);
    vscode.window.onDidChangeActiveTextEditor(linkTree.refresh);
  }
  if (viewConfig.enableBacklinks) {
    let backlinkTree = new ZTreeView('zbacklinks', 'BACKLINKS', lp.getCurrentBacklinks, sm.sortByDate);
    vscode.window.onDidChangeActiveTextEditor(backlinkTree.refresh);
  }

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
  let attachFileCom = vscode.commands.registerCommand("zettnote.attachFile", attachFile);
  let openAttachmentCom = vscode.commands.registerCommand("zettnote.openAttachment", openAttachment);
  context.subscriptions.push(createNoteCom);
  context.subscriptions.push(openLinkCom);
  context.subscriptions.push(attachFileCom);
  context.subscriptions.push(openAttachmentCom);
}

// this method is called when your extension is deactivated
export function deactivate() { }
