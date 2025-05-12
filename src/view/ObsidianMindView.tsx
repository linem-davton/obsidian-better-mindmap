import {
  ItemView,
  WorkspaceLeaf,
  TFile,
  App,
  Editor,
  MarkdownView,
} from "obsidian";
import React from "react";
import { createRoot, Root } from "react-dom/client";

import { VIEW_TYPE } from "../constants";
import { MindView, LinkClickHandler } from "./CoreView.tsx";

// Has Depedency on Obsidian
// Adapter for Obsidian
export class ReactMindView extends ItemView {
  private root: Root | null = null; // Use Root type
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
    return this.activeFile ? `${this.activeFile.basename}` : "Mind-Map";
  }
  getIcon() {
    return "brain-circuit";
  } // Example icon

  async onOpen() {
    this.containerEl.classList.add("mindmap-view-container");
    // Ensure content element exists and is clean
    const contentEl = this.containerEl.children[1];
    if (!contentEl) {
      console.error("Mindmap: Content element not found.");
      return;
    }
    contentEl.empty();
    this.root = createRoot(contentEl);

    const linkHandler = new ObsidianLinkHandler(this.app, this.leaf);
    this.mindView = new MindView(linkHandler);

    const firstFile = this.app.workspace.getActiveFile();
    if (firstFile?.extension === "md") {
      await this.parseAndRender(firstFile); // Initial load
    } else {
      this._renderView(); // Render empty state if no file
    }

    // -------------- Event Handlers -------------------
    this.registerEvent(
      this.app.workspace.on("file-open", async (file) => {
        if (this.mindView && file && file.extension === "md") {
          await this.parseAndRender(file); // Use combined method
        } else if (!file) {
          // Handle no file open? Clear the view?
          // await this.parseAndRender(null); // Pass null maybe?
          this.activeFile = null;
          this.mindView?.parseMarkdown(""); // Parse empty
          this._renderView(); // Render empty state
        }
      }),
    );

    this.registerEvent(
      this.app.workspace.on(
        "editor-change",
        (editor: Editor, view: MarkdownView) => {
          // Add types
          const file = view.file;
          // Ensure mindView exists and the changed file is the one we are showing
          if (this.mindView && file && file === this.activeFile) {
            // Only parse and render, don't need await here unless parseMarkdown becomes async
            this.mindView.parseMarkdown(editor.getValue());
            this._renderView(); // Only re-render after parsing
          }
        },
      ),
    );

    this.registerEvent(
      this.app.vault.on("modify", async (file) => {
        // Ensure it's a TFile and the one we are tracking
        if (
          this.mindView &&
          file instanceof TFile &&
          file === this.activeFile
        ) {
          // Parse and Render
          this.mindView.parseMarkdown(await this.app.vault.cachedRead(file));
          this._renderView(); // Only re-render after parsing
        }
      }),
    );
  }

  async onClose() {
    this.root?.unmount();
    this.root = null;
    this.mindView = null;
    console.log("Mindmap view closed");
  }

  /**
   * Public method called by the Reset command.
   * Increments the trigger and re-renders the view WITHOUT re-parsing.
   */
  public resetView() {
    this.resetViewTrigger++; // Increment the reset trigger
    this._renderView(); // <<--- Call the rendering method ONLY
  }

  /**
   * Parses markdown from a file and triggers a re-render.
   * Handles setting the active file.
   */
  private async parseAndRender(file: TFile | null) {
    if (file === this.activeFile && file !== null) return; // Avoid redundant loads

    this.activeFile = file;
    this.leaf.updateHeader(); // Update tab title

    if (this.mindView && file) {
      const mdContent = await this.app.vault.cachedRead(file);
      this.mindView.parseMarkdown(mdContent); // Parse the new content
    } else if (this.mindView) {
      // Handle case where file is null (e.g., no file open)
      this.mindView.parseMarkdown(""); // Render empty state
    }
    this._renderView(); // Trigger render after parsing
  }

  /**
   * Renders the React view using the current state (triggers, tree data in mindView).
   */
  private _renderView() {
    if (!this.root || !this.mindView) {
      console.warn(
        "Mindmap: Attempted to render before root or MindView was initialized.",
      );
      return;
    }

    // Ensure activeFile is checked before accessing properties
    const displayName = this.activeFile?.basename ?? "Mind Map";
    const fileId = this.activeFile?.path ?? "no-active-file"; // Use a default key if no file

    // Get the React element from MindView, passing the current trigger value
    const reactElement = this.mindView.getView(
      displayName,
      fileId,
      this.resetViewTrigger, // Pass the current reset trigger
    );

    // Render the element
    this.root.render(React.createElement(React.Fragment, null, reactElement));
  }
}

class ObsidianLinkHandler implements LinkClickHandler {
  constructor(
    private app: App,
    private currentLeaf: WorkspaceLeaf,
  ) {}

  handleInternalLink(href: string): void {
    const target = decodeURIComponent(href);
    const sourcePath = this.currentLeaf.view.getState()?.file ?? "";
    // Consider letting Obsidian handle it for better cross-window behavior:
    this.app.workspace.openLinkText(target, sourcePath, false, {
      active: true,
    });
  }

  handleExternalLink(href: string): void {
    this.app.openExternalLink(href); // Use Obsidian's method
  }
}
