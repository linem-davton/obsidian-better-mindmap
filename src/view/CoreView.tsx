import { parseMindMapWithCache } from "../parser/parseOutline.ts";
import { MindNode } from "../parser/types";
import { MindCanvas } from "../ui/canvas/MindCanvas.tsx";
import { App, TFile } from "obsidian";

export class MindView {
  private tree: MindNode[];
  private linkHandler: LinkClickHandler;

  constructor(linkHandler: LinkClickHandler) {
    this.linkHandler = linkHandler;
  }

  public parseMarkdown(app: App, file: TFile, md: string) {
    this.tree = parseMindMapWithCache(app, file, md);
  }
  public getView(
    app: App,
    sourcePath: string,
    rootName: string,
    id: string,
    resetViewTrigger: number,
  ) {
    let root = {
      id: "root",
      text: rootName,
      level: 0,
      children: this.tree,
    };
    return (
      <MindCanvas
        key={{ id }}
        app={app}
        sourcePath={sourcePath}
        tree={[root]}
        onLinkClick={this.linkClickHandler}
        resetViewTrigger={resetViewTrigger}
      />
    );
  }

  private linkClickHandler = (href: string) => {
    const external = /^[a-z][a-z\d+\-.]*:/.test(href);
    if (external) {
      this.linkHandler.handleInternalLink(href);
    } else {
      this.linkHandler.handleInternalLink(href);
    }
  };
}

export interface LinkClickHandler {
  handleInternalLink(href: string): void;
  handleExternalLink(href: string): void;
}
