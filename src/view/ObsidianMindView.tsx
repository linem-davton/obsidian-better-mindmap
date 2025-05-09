import { ItemView, WorkspaceLeaf } from "obsidian";
import { createRoot } from "react-dom/client";

import { VIEW_TYPE } from "../constants";
import { MindView, LinkClickHandler } from "./CoreView.tsx";

// Has Depedency on Obsidian
// Adapter for Obsidian
export class ReactMindView extends ItemView {
  private root: ReturnType<typeof createRoot> | null = null;
  private activeFile: TFile | null = null;
  private mindView: MindView | null = null;

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
    const linkHandler = new ObsidianLinkHandler(this.app, this.leaf);
    this.mindview = new MindView(linkHandler);

    // initial
    const first = this.app.workspace.getActiveFile();
    if (first?.extension === "md") await this.renderFile(first);

    // -------------- Event Handlers -------------------
    this.registerEvent(
      this.app.workspace.on("file-open", async (file) => {
        if (file && file.extension === "md") await this.renderFile(file);
      }),
    );

    this.registerEvent(
      this.app.workspace.on("editor-change", (editor, view) => {
        const file = view.file;
        if (file && file === this.activeFile) {
          this.updateTree(editor.getValue());
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

  // Obsidian Callback
  async onClose() {
    this.root?.unmount();
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
    this.mindview.parseMarkdown(md);
    this.root!.render(
      this.mindview.getView(this.activeFile!.basename, this.activeFile!.path),
    );
  }
}

class ObsidianLinkHandler implements LinkClickHandler {
  constructor(
    private app: App,
    private currentLeaf: WorkspaceLeaf,
  ) {}

  handleInternalLink(href: string): void {
    const target = decodeURIComponent(href);
    const mdLeaves = this.app.workspace.getLeavesOfType("markdown");
    const other = mdLeaves.find((l) => l !== this.currentLeaf);

    if (other) {
      this.app.workspace.openLinkText(target, "", false, other);
    } else {
      const newLeaf = this.app.workspace.splitActiveLeaf("vertical");
      this.app.workspace.openLinkText(target, "", false, newLeaf);
    }
  }

  handleExternalLink(href: string): void {
    window.open(href);
  }
}
