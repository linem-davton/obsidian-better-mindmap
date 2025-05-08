/*
 
 Headings (# … – ###### …) → level = heading depth‑1.

/* ---------- src/parser/parseOutline.ts ---------- */
import { MindNode } from "./types";

/* 2 spaces (or 1 tab=4 spaces) = one bullet level */
function indentUnits(wh: string) {
  return Math.floor(wh.replace(/\t/g, "    ").length / 2);
}

/* Build an ID like "0-2-1" = root → 3rd child → 2nd grand-child */
function childId(parentId: string, index: number) {
  return parentId ? `${parentId}-${index}` : `${index}`;
}

export function parseOutline(md: string): MindNode[] {
  const root: MindNode = { id: "", text: "ROOT", level: 0, children: [] };
  const stack: MindNode[] = [root]; // node chain for each depth
  let bulletBaseDepth = 1; // bullets hang under last heading

  md.split("\n").forEach((raw) => {
    let line = raw.trimEnd();
    if (!line) return; // skip empty lines

    /* -------- headings ------------------------------------------------ */
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const depth = h[1].length; // H1 => depth 1
      stack.length = depth; // cut stack to parent level
      const parent = stack[depth - 1];
      const index = parent.children.length;
      const node: MindNode = {
        id: childId(parent.id, index),
        text: h[2].trim(),
        level: depth,
        children: [],
      };
      parent.children.push(node);
      stack.push(node);
      bulletBaseDepth = depth + 1; // bullets nest under this
      return;
    }

    /* -------- bullets ------------------------------------------------- */
    const li = line.match(/^(\s*)[-*+]\s+(.*)$/);
    if (li) {
      const indent = indentUnits(li[1]);
      let depth = bulletBaseDepth + indent; // absolute depth
      if (depth > stack.length) depth = stack.length;

      const parent = stack[depth - 1];
      const index = parent.children.length;
      const node: MindNode = {
        id: childId(parent.id, index),
        text: li[2].trim(),
        level: depth,
        children: [],
      };

      parent.children.push(node);
      stack.length = depth; // truncate to parent + push
      stack.push(node);
    }
  });

  return root.children; // caller adds filename root
}
