import { Plugin } from "obsidian";
import { ReactMindView } from "./view/ObsidianMindView.tsx";
import { VIEW_TYPE } from "./constants";
import "./style/extra.css";

export default class BetterMindmap extends Plugin {
  async onload() {
    this.registerView(VIEW_TYPE, (leaf) => new ReactMindView(leaf));
    this.addCommand({
      id: "open-mindmap",
      name: "Open Mind‑Map",
      callback: () =>
        this.app.workspace.getLeaf(true).setViewState({
          type: VIEW_TYPE,
          active: true,
        }),
    });
  }
}
