// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { existsSync, readFile, writeFileSync } from "fs";
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
import { getEnabledCategories } from "trace_events";

enum Status {
  incomplete,
  complete,
  running,
}

class Graph {
  nodes: Set<Uri>;
  edges: Set<[Uri, Uri]>;
  constructor() {
    this.nodes = new Set<Uri>();
    this.edges = new Set<[Uri, Uri]>();
  }

  addNode(u: Uri) {
    this.nodes.add(u);
  }

  addEdge(start: Uri, stop: Uri) {
    this.edges.add([start, stop]);
  }

  getLinks(uri: Uri, i = 0) {
    return new Set(
      Array.from(this.edges).map((e) => {
        e[i] === uri;
        // If i is 0 get the 1 index, otherwise it's 1 so get the 0 index
        return e[(i = 0 ? 1 : 0)];
      })
    );
  }

  getBacklinks(u: Uri) {
    return this.getLinks(u, 1);
  }
}
var sync_status = Status.incomplete;

const FILE_GLOB = "*.{md,markdown}";
const LINK_REGEX = /\[\[[\w\-. ]+\]\]/i;

function fname(u: Uri) {
  return basename(u.fsPath, "." + u.fsPath.split(".").pop());
}

function getFilesFromString(links: Set<string>) {
  return getWorkspaceFiles().then((files) => {
    return files.filter((f) => {
      return links.has(fname(f));
    });
  });
}

function getLinks(file: Uri) {
  return workspace.fs
    .readFile(file)
    .then((res) => {
      return res
        .toString()
        .split(/\s/)
        .filter((w) => w.match(LINK_REGEX))
        .map((w) => w.slice(2, -2));
    })
    .then((links) => {
      return getFilesFromString(new Set(links));
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
      //if (res.has(target)) {
      //console.debug("Found backlink");
      //backlinks.add(file);
      //}
    });
  });
  return backlinks;
}

function getWorkspaceFiles() {
  return workspace.findFiles("**/" + FILE_GLOB).then((files) => {
    return files.filter((file) => file.scheme === "file");
  });
}

function getEdges(u: Uri) {
  const links = await getLinks(u);
  return links;
}

function sync(g: Graph) {
  const files = await getWorkspaceFiles();
  files.forEach(async (file) => {
    g.addNode(file);
    const edges = await getEdges(file);
    edges.forEach((edge) => {
      g.addEdge(file, edge);
    });
  });
  return g;
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
  var retVal = new Set<Uri>();
  if (openFile) {
    const g = await sync(new Graph());
    retVal = g.getBacklinks(openFile);
  }
  return retVal;
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
      getCurrentBacklinks().then((result) => {
        console.log(result);
      });
    }
  );

  context.subscriptions.push(getLinksCom);
  context.subscriptions.push(getBacklinksCom);
}

// this method is called when your extension is deactivated
export function deactivate() {}
