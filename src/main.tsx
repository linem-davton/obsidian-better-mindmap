import { Plugin } from "obsidian";
import { ReactMindView } from "./view/ObsidianMindView.tsx";
import { VIEW_TYPE } from "./constants";
import "./style/extra.css";

export default class BetterMindmap extends Plugin {
  async onload() {
    this.registerView(VIEW_TYPE, (leaf) => new ReactMindView(leaf));
    this.addCommand({
      id: "open-mindmap",
      name: "Open mind map",
      callback: () =>
        this.app.workspace.getLeaf(true).setViewState({
          type: VIEW_TYPE,
          active: true,
        }),
    });

    // --- Command to RESET the active view ---
    this.addCommand({
      id: "reset-mindmap-view",
      name: "Reset mind map view",
      // Use checkCallback to only enable/run when a mind map view is active
      checkCallback: (checking: boolean) => {
        const activeMindMapView =
          this.app.workspace.getActiveViewOfType(ReactMindView);
        if (activeMindMapView) {
          // If Obsidian is just checking if the command should be enabled
          if (checking) {
            return true;
          }
          // If Obsidian is actually running the command
          activeMindMapView.resetView(); // <-- Call the public reset method
          return true; // Indicate the command was successful
        }
        // If no active mind map view, disable the command
        return false;
      },
    });
  }
}
