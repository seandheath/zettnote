// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { existsSync, writeFileSync } from "fs";
import { basename, dirname, join, normalize, relative, resolve } from "path";
import {
  CancellationToken,
  commands,
  CompletionContext,
  CompletionItemProvider,
  ExtensionContext,
  FileSystem,
  languages,
  Position,
  TextDocument,
  Uri,
  window,
  workspace,
} from "vscode";
var graph = require("graph-data-structure");
enum Status {
  incomplete,
  complete,
  running,
}

const FILE_GLOB = "*.{md,markdown}";
const LINK_REGEX = /\[\[[\w\-. ]+\]\]/i;

function fname(u: Uri) {
  return basename(u.fsPath, "." + u.fsPath.split(".").pop());
}

async function getFilesFromString(links: Set<string>) {
  return getWorkspaceFiles().then((res) => {
    return new Set(
      res.filter((u) => {
        console.debug(fname(u) + " " + links.has(fname(u)));
        links.has(fname(u));
      })
    );
  });
}

async function getLinks(file: Uri) {
  return workspace.fs.readFile(file).then((res) => {
    const links = new Set(
      res
        .toString()
        .split(/\s/)
        .filter((w) => w.match(LINK_REGEX))
        .map((w) => w.slice(2, -2))
    );
    return getFilesFromString(links);
  });
}

function getBacklinks(target: Uri, files: Set<Uri>): Set<Uri> {
  // Iterate over each file in the file set (should contain every markdown file
  // in the workspace)
  var backlinks = new Set<Uri>();
  console.debug("Looking for backlinks to: " + basename(target.fsPath));
  files.forEach((file) => {
    console.debug("Checking file :" + basename(file.fsPath));
    getLinks(file).then((res) => {
      console.debug("Got links: " + res);
      if (res.has(target)) {
        console.debug("Found backlink");
        backlinks.add(file);
      }
    });
  });
  return backlinks;
}

function getNodes() {
  const files = workspace.findFiles("**/" + FILE_GLOB).then((res) => {
    res.map((f) => graph.addNode(fname(f)));
  });
}

/*
class MDCompletionItemProvider implements CompletionItemProvider {
  public async provideCompletionItems(
    document: TextDocument,
    position: Position,
    _token: CancellationToken,
    context: CompletionContext
  ) {}
}
*/

function getCurrentBacklinks() {
  const openFile = window.activeTextEditor?.document.uri;
  if (openFile) {
    getWorkspaceFiles().then((res) => {
      const links = getBacklinks(openFile, new Set(res));
      console.debug(links);
    });
  }
}

function getCurrentLinks() {
  const openFile = window.activeTextEditor?.document.uri;
  if (openFile) {
    getLinks(openFile);
  }
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors
  // (console.error) This line of code will only be executed once when your
  // extension is activated
  console.log("Zettnote is now active");
  const md = { scheme: "file", language: "markdown" };
  /*
  context.subscriptions.push(
    languages.registerCompletionItemProvider(md, new MDCompletionItemProvider())
  );
  */

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let getLinksCom = commands.registerCommand("zettnote.getLinks", () => {
    getCurrentLinks();
  });
  let getBacklinksCom = commands.registerCommand(
    "zettnote.getBacklinks",
    () => {
      getCurrentBacklinks();
    }
  );

  context.subscriptions.push(getLinksCom);
  context.subscriptions.push(getBacklinksCom);
}

// this method is called when your extension is deactivated
export function deactivate() {}
