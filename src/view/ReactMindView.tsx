import { ItemView, WorkspaceLeaf } from "obsidian";
import { createRoot } from "react-dom/client";
import * as React from "react";

import { parseOutline } from "../parser/parseOutline";
import MindCanvas from "../ui/canvas/MindCanvas";
import { MindNode } from "../parser/types";
import { VIEW_TYPE } from "../constants";

// Has Depedency on Obsidian
export class ReactMindView extends ItemView {
  private root: ReturnType<typeof createRoot> | null = null;
  private activeFile: TFile | null = null;

  // Obsidian Callback
  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  // Obsidian Callback
  getViewType() {
    return VIEW_TYPE;
  }

  // Obsidian Callback
  getDisplayText() {
    return this.activeFile ? `${this.activeFile.basename}` : "Mind-Map";
  }

  // Obsidian Callback
  getIcon() {
    return "map";
  }

  // Obsidian Callback
  async onOpen() {
    this.containerEl.classList.add("mindmap-view-container");
    this.root = createRoot(this.containerEl);

    // initial
    const first = this.app.workspace.getActiveFile();
    if (first?.extension === "md") await this.renderFile(first);

    // follow every note that becomes visible in *any* leaf
    this.registerEvent(
      this.app.workspace.on("file-open", async (file) => {
        if (file && file.extension === "md") await this.renderFile(file);
      }),
    );

    this.registerEvent(
      this.app.workspace.on("editor-change", (editor, view) => {
        // view is guaranteed to be MarkdownView
        const file = view.file;
        if (file && file === this.activeFile) {
          this.updateTree(editor.getValue()); // repaint instantly
        }
      }),
    );

    /* external file modifications */
    this.registerEvent(
      this.app.vault.on("modify", async (file) => {
        if (file === this.activeFile) {
          this.updateTree(await this.app.vault.cachedRead(file));
        }
      }),
    );
  }

  /* helper */
  private async renderFile(file: TFile) {
    if (file === this.activeFile) return;
    this.activeFile = file;
    this.leaf.updateHeader();

    const md = await this.app.vault.cachedRead(file);
    await this.updateTree(md);
  }

  private async updateTree(md: string) {
    const tree = parseOutline(md);

    const root: MindNode = {
      id: "root",
      text: this.activeFile!.basename,
      level: 0,
      children: tree,
    };

    this.root!.render(<MindCanvas key={this.activeFile!.path} tree={[root]} />);
  }

  async onClose() {
    this.root?.unmount();
  }
}
