import { parseOutline, MindNode } from "../parser/parseOutline.ts";
import { MindCanvas } from "../ui/canvas/MindCanvas.tsx";

export class MindView {
  private tree: MindNode[];
  private root: MindNode;
  private linkHandler: LinkClickHandler;

  constructor(linkHandler: LinkClickHandler) {
    this.linkHandler = linkHandler;
  }

  public parseMarkdown(md: string) {
    this.tree = parseOutline(md);
  }
  public getView(rootName: string, id: string) {
    this.root = {
      id: "root",
      text: rootName,
      level: 0,
      children: this.tree,
    };
    return (
      <MindCanvas
        key={{ id }}
        tree={[this.root]}
        onLinkClick={this.linkClickHandler}
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
