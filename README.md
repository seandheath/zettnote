# Zettnote README

Zettnote is a VSCode extension that adds functionality to implement a metadata-free markdown based [zettelkasten](https://translate.google.com/translate?hl=en&sl=de&u=https://de.wikipedia.org/wiki/Zettelkasten&prev=search) aiming to give functionality similar to [Roam Research](https://roamresearch.com/) or [org-roam](https://org-roam.readthedocs.io/en/master/).

## Features

Zettnote doesn't require any metadata, database, or modification of typical markdown files beyond using wikilink syntax. When a markdown file is opened it scans the workspace for other markdown files and generates the list of links and backlinks dynamically.

Zettnote supports the following features:

- Wikilink style syntax: `[[link]]`
- Link autocomplete
- Follow links to the containing notes
- Create new notes from unpopulated links
  Org-roam also uses Graphviz to generate a graph, with notes as nodes, and links between them as edges. The generated graph can be used to navigate to the files, but this requires some additional setup described in the Roam Protocol page.

- View all backlinks from other notes to this note

## Requirements

TODO validate requirements

## Extension Settings

This extension contributes the following settings:

- `zettnote.createNote`: defaults to `[Ctrl/Cmd]+Alt+n` to create or open a note.
- TODO: `zettnote.attachFile`: moves file to attachment folder and creates a hyperlink to it.
- TODO: `zettnote.showGraph`: generates dot graph of notes.
- TODO: `zettnote.exportNote`: export note, stripping wikilinks or converting them to normal text.

## Known Issues

- Not sure how the extension will work with a large amount of notes, currently seems good with dozens. Have not implemented caching of links.

## Release Notes

Users appreciate release notes as you update your extension.

### 0.1.0

Currently under development
