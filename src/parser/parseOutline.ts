/*
 
 Headings (# … – ###### …) → level = heading depth‑1.

Bullets (-, *, +) → level relative to current heading; indent width = 2/4 spaces or tab.

Ignore paragraphs / code blocks / tables.
Stop at HTML comments <!-- mindmap‑ignore‑start -->
 
 */

/* ---------- src/parser/parseOutline.ts ---------- */
import { MindNode } from "./types";

function indentUnits(whitespace: string) {
  const len = whitespace.replace(/\t/g, "    ").length;
  return Math.floor(len / 2); // 2 spaces → +1 level
}
export function parseOutline(md: string): MindNode[] {
  const root: MindNode = {
    id: crypto.randomUUID(),
    text: "ROOT",
    level: 0,
    children: [],
  };
  const stack: MindNode[] = [root];
  let bulletBaseDepth = 1;

  const lines = md.split("\n");
  for (let raw of lines) {
    // ← declare loop variable
    let line = raw; // make mutable copy
    let link: string | undefined;

    /* wikilink ------------------------------------------------------ */
    const wiki = line.match(/\[\[([^\]]+?)\]\]/);
    if (wiki) {
      link = wiki[1];
      line = line.replace(wiki[0], link); // strip brackets for display
    }

    /* heading ------------------------------------------------------- */
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const depth = h[1].length; // H1 → depth 1
      stack.length = depth;
      const node: MindNode = {
        id: crypto.randomUUID(),
        text: h[2].trim(),
        link,
        level: depth,
        children: [],
      };
      stack[depth - 1].children.push(node);
      stack.push(node);
      bulletBaseDepth = stack.length;
      continue;
    }

    /* bullet -------------------------------------------------------- */
    const li = line.match(/^(\s*)[-*+]\s+(.*)$/);
    if (li) {
      const indent = indentUnits(li[1]);
      let depth = bulletBaseDepth + indent;
      if (depth > stack.length) depth = stack.length;

      const parent = stack[depth - 1];
      const node: MindNode = {
        id: crypto.randomUUID(),
        text: li[2].trim(),
        link,
        level: depth,
        children: [],
      };

      parent.children.push(node);
      stack.length = depth;
      stack.push(node);
    }
  }

  return root.children;
}
