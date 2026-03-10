# SuperOffice Tools (VS Code Extension)

SuperOffice Tools adds a dedicated SuperOffice view container to VS Code and provides commands for authenticating and working with Scripts and Extra Tables in SuperOffice.

> [!NOTE] Works towards SOD and is under development, suggestions welcome!

## Getting started

1. Open the SuperOffice container in the Activity bar and click login.
2. After authenticating Treeviews with scripts and extratables will appear.

## VS Code contributions

This extension contributes the following functionality via the VS Code API.

### Activity Bar container and views

The extension adds a SuperOffice container to the Activity Bar with these views:

- Scripts (ejfasting.view.scripts)
  - Visible when authenticated: superoffice.isAuthenticated

- Extra Tables Explorer (ejfasting.view.extraTables)
  - Visible when authenticated: superoffice.isAuthenticated

#### Welcome and login experience (when not authenticated)

When you are not authenticated, the an empty View shows a welcome message and a Login link that runs:

- Login -> command:ejfasting.authenticate

### Commands

You can run these from the Command Palette:

- Authenticate with SuperOffice (ejfasting.authenticate)
- View Script Details (ejfasting.script.viewDetails)
- Download Script (ejfasting.script.download)
- Download Script Folder (ejfasting.script.downloadFolder)

### Context menus

In the Scripts view, the extension contributes context menu actions:

- For script items: Download Script
- For folder items: Download Script Folder

### Source Control (SCM) integration

The extension registers the superoffice SCM provider which VS Code will use to show inline/context actions for its resources:

- Discard Changes (ejfasting.scm.discardChanges)
- Open File (ejfasting.scm.openFile)

These appear in the Source Control view.

It compares the local file to what was last downloaded from the SuperOffice tenant and creates diffs.

## Troubleshooting

- If the SuperOffice views are not visible, ensure you have authenticated successfully.
- If you remain in the Empty View, re-run Authenticate with SuperOffice from the Command Palette.

## Feedback and contributions

Please file issues or contribute PRs in the repository:
https://github.com/ejfasting/superoffice-tools
