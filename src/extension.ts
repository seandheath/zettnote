// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { existsSync, readFile, writeFileSync } from "fs";
import { basename, dirname, join, normalize, relative, resolve } from "path";
import { getEnabledCategories } from "trace_events";
import { downloadAndUnzipVSCode } from "vscode-test";
import vscode = require('vscode');

enum Status {
  incomplete,
  complete,
  running,
}

const FILE_GLOB = "*.{md,markdown}";
const LINK_REGEX = /\[\[[\w\-. ]+\]\]/i;

class Graph {
  nodes: Set<vscode.Uri>;
  edges: Set<[vscode.Uri, vscode.Uri]>;
  initialized: Boolean;

  constructor() {
    this.nodes = new Set<vscode.Uri>();
    this.edges = new Set<[vscode.Uri, vscode.Uri]>();
    this.initialized = false;
  }

  getNodeNames() {
    const nodeArray = Array.from(this.nodes);
    return nodeArray.map((node) => getName(node));
  }

  getUri(link: string) {
    const nodeArray = Array.from(this.nodes);
    const matches = nodeArray.filter((node) => {
      return getName(node) === link;
    });
    if (matches.length > 1) {
      console.error("Multiple nodes match the provided link: " + link);
    }
    return matches[0];
  }

  addNode(u: vscode.Uri) {
    this.nodes.add(u);
  }

  addEdge(start: vscode.Uri, stop: vscode.Uri) {
    this.edges.add([start, stop]);
  }

  addEdges(file: vscode.Uri, edges: vscode.Uri[]) {
    edges.forEach((edge) => {
      this.addEdge(file, edge);
    });
  }

  getLinks(uri: vscode.Uri, i = 0) {
    const links = Array.from(this.edges).filter((edge) => {
      return edge[i].fsPath === uri.fsPath;
    }).map((edge) => {
      // Return only the edge we didn't pass in
      return edge[i ? 0 : 1];
    });
    return new Set(links);
  }

  getBacklinks(u: vscode.Uri) {
    return this.getLinks(u, 1);
  }
}

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

async function getLinks(file: vscode.Uri) {
  const contents = await vscode.workspace.fs.readFile(file);
  const links = contents
    .toString()
    .split(/\s/)
    .filter((w) => w.match(LINK_REGEX))
    .map((w) => w.slice(2, -2));
  return links;
}

async function getWorkspaceFiles() {
  return vscode.workspace.findFiles("**/" + FILE_GLOB).then((files) => {
    return files.filter((file) => file.scheme === "file");
  });
}

async function getEdges(u: vscode.Uri) {
  const links = await getLinks(u);
  const edges = await getFilesFromLinks(new Set(links));
  return edges;
}

async function asyncForEach(array: any, callback: any) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

async function updateGraph(g: Graph) {
  const files = await getWorkspaceFiles();
  const tg = new Graph();
  await asyncForEach(Array.from(files), async (file: vscode.Uri) => {
    const edges = await getEdges(file);
    tg.addNode(file);
    tg.addEdges(file, edges);

  });
  g.nodes = tg.nodes;
  g.edges = tg.edges;
  g.initialized = true;
  return g;
};

class MDCompletionItemProvider implements vscode.CompletionItemProvider {
  graph: Graph;

  constructor(g: Graph) {
    this.graph = g;
  }

  provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
    let linePrefix = document.lineAt(position).text.substr(0, position.character);
    if (!linePrefix.endsWith('[[')) {
      return undefined;
    }
    var names = this.graph.getNodeNames();
    var items = names.map((name) => {
      var kind = vscode.CompletionItemKind.File;
      var label = name;
      var item = new vscode.CompletionItem(label, kind);
      return item;
    });
    return items;
  }
}

class MDDefinitionProvider implements vscode.DefinitionProvider {
  graph: Graph;

  constructor(g: Graph) {
    this.graph = g;
  }

  provideDefinition(document: vscode.TextDocument, position: vscode.Position) {
    var range = document.getWordRangeAtPosition(position, LINK_REGEX);
    if (range) {
      // The character position is within the tag
      const link = document.lineAt(position).text.slice(range.start.character + 2, range.end.character - 2);
      const uri = this.graph.getUri(link);
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

function getCurrentBacklinks(g: Graph) {
  const openFile = vscode.window.activeTextEditor?.document.uri;
  if (openFile) {
    console.debug("Checking backlinks for: " + getName(openFile));
    const backlinks = g.getBacklinks(openFile);
    return backlinks;
  }
  // return empty set if no links found
  return new Set<vscode.Uri>();
}

function getCurrentLinks(g: Graph) {
  const openFile = vscode.window.activeTextEditor?.document.uri;
  if (openFile) {
    //return getLinks(openFile);
    return g.getLinks(openFile);
  }
  return new Set<vscode.Uri>();
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors
  // (console.error) This line of code will only be executed once when your
  // extension is activated
  console.log("Zettnote is now active");
  var graph = new Graph();
  graph = await updateGraph(graph);

  const md = { scheme: "file", language: "markdown" };
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(md, new MDCompletionItemProvider(graph), '['),
    vscode.languages.registerDefinitionProvider(md, new MDDefinitionProvider(graph))
  );

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let getLinksCom = vscode.commands.registerCommand("zettnote.getLinks", () => getCurrentLinks(graph));
  let getBacklinksCom = vscode.commands.registerCommand(
    "zettnote.getBacklinks", () => getCurrentBacklinks(graph));

  context.subscriptions.push(getLinksCom);
  context.subscriptions.push(getBacklinksCom);
}

// this method is called when your extension is deactivated
export function deactivate() { }
