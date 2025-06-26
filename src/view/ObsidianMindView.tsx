import { ItemView, WorkspaceLeaf, TFile, App } from "obsidian";
import React from "react";
import { createRoot, Root } from "react-dom/client";

import { VIEW_TYPE } from "../constants";
import { MindView, LinkClickHandler } from "./CoreView.tsx"; // Assuming these are your core view components

// Has Dependency on Obsidian
// Adapter for Obsidian
export class ReactMindView extends ItemView {
  private root: Root | null = null;
  private activeFile: TFile | null = null;
  private mindView: MindView | null = null;
  private resetViewTrigger: number = 0;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType() {
    return VIEW_TYPE;
  }
  getDisplayText() {
    return this.activeFile ? `${this.activeFile.basename}` : "Mind map";
  }
  getIcon() {
    return "brain-circuit";
  }

  async onOpen() {
    this.containerEl.classList.add("mindmap-view-container");
    const contentEl = this.containerEl.children[1];
    if (!contentEl) {
      console.error("Mindmap: Content element not found.");
      return;
    }
    contentEl.empty();
    this.root = createRoot(contentEl);

    // Assuming ObsidianLinkHandler is defined elsewhere and works as before
    const linkHandler = new ObsidianLinkHandler(this.app, this.leaf);
    this.mindView = new MindView(linkHandler);

    // Initial load with the currently active file, if any
    const firstFile = this.app.workspace.getActiveFile();
    if (firstFile?.extension === "md") {
      await this.parseAndRender(firstFile);
    } else {
      this._renderView(); // Render empty state if no file
    }

    // --- Event Handlers ---

    // 1. Handle switching to a different file
    this.registerEvent(
      this.app.workspace.on("file-open", async (file) => {
        if (this.mindView && file && file.extension === "md") {
          await this.parseAndRender(file);
        } else {
          // A non-markdown file or no file is active, clear the view
          await this.parseAndRender(null);
        }
      }),
    );

    // 2. Handle modifications to the CURRENT file (replaces 'editor-change' and 'vault.on.modify')
    this.registerEvent(
      this.app.metadataCache.on("changed", async (file) => {
        // Check if the file that changed is the one we are displaying
        if (file === this.activeFile) {
          // Re-run the parsing and rendering for the active file.
          // We don't need to read the file content again here, as parseAndRender does it.
          await this.parseAndRender(file);
        }
      }),
    );
  }

  async onClose() {
    this.root?.unmount();
    this.root = null;
    this.mindView = null;
  }

  public resetView() {
    this.resetViewTrigger++;
    this._renderView();
  }

  /**
   * Centralized method to parse a file's content and trigger a re-render.
   * This is called on initial load, file switching, and file modification.
   */
  private async parseAndRender(file: TFile | null) {
    // Avoid redundant loads if the file hasn't changed.
    // Important for the 'changed' event which might fire multiple times.
    if (file === this.activeFile && file !== null) {
      // If we want to force re-parsing even if the file is the same (which we do for the 'changed' event),
      // we need a slightly different check. Let's simplify and always re-parse if called.
    }

    // A check to prevent re-parsing if the content is identical might be useful later, but for now this is robust.

    this.activeFile = file;
    this.leaf.updateHeader(); // Update tab title

    if (this.mindView && file) {
      const mdContent = await this.app.vault.cachedRead(file);
      // Assuming mindView.parseMarkdown is now your function that uses parseMindMapWithCache
      this.mindView.parseMarkdown(this.app, file, mdContent);
    } else if (this.mindView) {
      // Handle case where file is null (e.g., no file open)
      this.mindView.parseMarkdown(this.app, null, ""); // Parse empty content
    }

    this._renderView(); // Trigger React render after parsing
  }

  /**
   * Renders the React component.
   */
  private _renderView() {
    if (!this.root || !this.mindView) {
      console.warn(
        "Mindmap: Attempted to render before root or MindView was initialized.",
      );
      return;
    }

    const displayName = this.activeFile?.basename ?? "Mind map";
    const fileId = this.activeFile?.path ?? "no-active-file";

    const reactElement = this.mindView.getView(
      this.app,
      this.activeFile?.path ?? "",
      displayName,
      fileId,
      this.resetViewTrigger,
    );

    this.root.render(React.createElement(React.Fragment, null, reactElement));
  }
}

// Dummy Link Handler class to make the example self-contained
class ObsidianLinkHandler implements LinkClickHandler {
  constructor(
    private app: App,
    private currentLeaf: WorkspaceLeaf,
  ) {}
  handleInternalLink(href: string): void {
    this.app.workspace.openLinkText(
      href,
      this.currentLeaf.view.getState()?.file ?? "",
    );
  }
  handleExternalLink(href: string): void {
    window.open(href, "_blank");
  }
}
