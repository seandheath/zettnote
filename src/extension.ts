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

const FILE_GLOB = "*.{md,markdown}";
const LINK_REGEX = /\[\[[\w\-. ]+\]\]/i;

class Graph {
  nodes: Set<Uri>;
  edges: Set<[Uri, Uri]>;
  initialized: Boolean;

  constructor() {
    this.nodes = new Set<Uri>();
    this.edges = new Set<[Uri, Uri]>();
    this.initialized = false;
  }

  addNode(u: Uri) {
    this.nodes.add(u);
  }

  addEdge(start: Uri, stop: Uri) {
    this.edges.add([start, stop]);
  }

  addEdges(file: Uri, edges: Uri[]) {
    edges.forEach((edge) => {
      this.addEdge(file, edge);
    });
  }

  getLinks(uri: Uri, i = 0) {
    const links = Array.from(this.edges).filter((edge) => {
      return edge[i].fsPath === uri.fsPath;
    }).map((edge) => {
      // Return only the edge we didn't pass in
      return edge[i ? 0 : 1];
    });
    return new Set(links);
  }

  getBacklinks(u: Uri) {
    return this.getLinks(u, 1);
  }
}

function fname(u: Uri) {
  return basename(u.fsPath, "." + u.fsPath.split(".").pop());
}

async function getFilesFromLinks(links: Set<string>) {
  const allFiles = await getWorkspaceFiles();
  const linkedFiles = Array.from(allFiles).filter((f) => {
    return links.has(fname(f));
  });
  return linkedFiles;
}

async function getFileFromLink(link: string) {
  const file = await getFilesFromLinks(new Set(link));
  if (file.length > 1) {
    // Shouldn't happen...
    console.error("more than one file matched link");
  }
  // return the first item from the set (should only be one)
  return file[0];
}

async function getLinks(file: Uri) {
  const contents = await workspace.fs.readFile(file);
  const links = contents
    .toString()
    .split(/\s/)
    .filter((w) => w.match(LINK_REGEX))
    .map((w) => w.slice(2, -2));
  return links;
}

async function getWorkspaceFiles() {
  return workspace.findFiles("**/" + FILE_GLOB).then((files) => {
    return files.filter((file) => file.scheme === "file");
  });
}

async function getEdges(u: Uri) {
  const links = await getLinks(u);
  const edges = await getFilesFromLinks(new Set(links));
  return edges;
}

async function asyncForEach(array: any, callback: any) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

async function updateGraph() {
  const g = new Graph();
  const files = await getWorkspaceFiles();
  await asyncForEach(Array.from(files), async (file: Uri) => {
    const edges = await getEdges(file);
    g.addNode(file);
    g.addEdges(file, edges);

  });
  g.initialized = true;
  return g;
};

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

function getCurrentBacklinks(g: Graph) {
  const openFile = window.activeTextEditor?.document.uri;
  if (openFile) {
    console.debug("Checking backlinks for: " + fname(openFile));
    const backlinks = g.getBacklinks(openFile);
    return backlinks;
  }
  // return empty set if no links found
  return new Set<Uri>();
}

function getCurrentLinks(g: Graph) {
  const openFile = window.activeTextEditor?.document.uri;
  if (openFile) {
    //return getLinks(openFile);
    return g.getLinks(openFile);
  }
  return new Set<Uri>();
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors
  // (console.error) This line of code will only be executed once when your
  // extension is activated
  console.log("Zettnote is now active");
  let graph = await updateGraph();
  const md = { scheme: "file", language: "markdown" };
  //init(graph);
  /*
  context.subscriptions.push(
    languages.registerCompletionItemProvider(md, new MDCompletionItemProvider())
  );
  */

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let getLinksCom = commands.registerCommand("zettnote.getLinks", () => getCurrentLinks(graph));
  let getBacklinksCom = commands.registerCommand(
    "zettnote.getBacklinks", () => getCurrentBacklinks(graph));

  context.subscriptions.push(getLinksCom);
  context.subscriptions.push(getBacklinksCom);
}

// this method is called when your extension is deactivated
export function deactivate() { }
