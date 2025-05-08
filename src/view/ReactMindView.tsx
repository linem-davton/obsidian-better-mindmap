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

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType() {
    return VIEW_TYPE;
  }
  getDisplayText() {
    return "Mind‑Map (React)";
  }

  async onOpen() {
    this.containerEl.style.height = "100%";
    this.containerEl.style.overflow = "hidden";
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
  }

  /* unchanged helper */
  private async renderFile(file: TFile) {
    if (file === this.activeFile) return;
    this.activeFile = file;

    const md = await this.app.vault.read(file);
    const tree = parseOutline(md);

    const root: MindNode = {
      id: "root",
      text: file.basename,
      level: 0,
      children: tree,
    };

    // key = file.path  → remounts MindCanvas, guarantees fresh layout
    this.root!.render(<MindCanvas key={file.path} tree={[root]} />);
  }

  async onClose() {
    this.root?.unmount();
  }
}
