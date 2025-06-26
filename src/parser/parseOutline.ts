import { App, TFile } from "obsidian";

// Assuming MindNode is defined like this in your types file
export interface MindNode {
  id: string;
  text: string;
  level: number;
  children: MindNode[];
}

// A temporary interface to hold combined heading and list item data for sorting
interface StructuralItem {
  level: number; // For headings: 1-6. For lists: indentation level + offset.
  line: number;
  node: MindNode;
}

/**
 * Calculates the indentation level of a list item string based on vault settings.
 * @param app - The Obsidian App object to get tab settings.
 * @param indentString - The string of whitespace at the start of the line.
 * @returns The calculated indentation level (0 for root).
 */
function calculateIndentLevel(app: App, indentString: string): number {
  const tabSize = app.vault.getConfig("tabSize");
  const indentWithSpaces = indentString.replace(/\t/g, " ".repeat(tabSize));
  return Math.floor(indentWithSpaces.length / tabSize);
}

/**
 * Parses the entire content of a file using Obsidian's metadata cache to build a mind map tree.
 * This is more robust than regex-based line-by-line parsing.
 *
 * @param app The Obsidian App object.
 * @param file The TFile to parse.
 * @param fileContent The full string content of the file.
 * @returns An array of root MindNodes that form the mind map tree.
 */
export function parseMindMapWithCache(
  app: App,
  file: TFile,
  fileContent: string,
): MindNode[] {
  const cache = app.metadataCache.getFileCache(file);
  if (!cache) {
    console.warn("Mind Map: Could not get file cache for", file.path);
    return [];
  }

  const fileLines = fileContent.split("\n");
  const items: StructuralItem[] = [];

  // 1. Process headings from the cache
  if (cache.headings) {
    for (const h of cache.headings) {
      const node: MindNode = {
        id: `${file.path}-h-${h.position.start.line}`,
        text: h.heading,
        level: h.level,
        children: [],
      };
      items.push({ level: h.level, line: h.position.start.line, node });
    }
  }

  // 2. Process list items from the cache
  if (cache.listItems) {
    for (const li of cache.listItems) {
      const lineText = fileLines[li.position.start.line];
      // Regex to safely extract indentation and text from a known list item line
      const match = lineText.match(/^(\s*)[-*+]\s(?:\[.\]\s)?(.*)$/);

      if (match) {
        const indentStr = match[1];
        const text = match[2].trim();

        // We add a large offset to list levels to keep them separate from heading levels (1-6)
        // during the tree-building step.
        const HEADING_LEVEL_COUNT = 6;
        const level =
          calculateIndentLevel(app, indentStr) + HEADING_LEVEL_COUNT + 1;

        const node: MindNode = {
          id: `${file.path}-li-${li.position.start.line}`,
          text: text,
          level: level,
          children: [],
        };
        items.push({ level: level, line: li.position.start.line, node });
      }
    }
  }

  // 3. Sort all structural items by their line number to process in document order
  items.sort((a, b) => a.line - b.line);

  // 4. Build the tree using a stack for hierarchy
  const treeRoots: MindNode[] = [];
  const stack: StructuralItem[] = [];

  for (const currentItem of items) {
    // Find the correct parent in the stack by popping items with a greater or equal level
    while (
      stack.length > 0 &&
      stack[stack.length - 1].level >= currentItem.level
    ) {
      stack.pop();
    }

    // If the stack is not empty, the top item is the parent
    if (stack.length > 0) {
      const parentItem = stack[stack.length - 1];
      parentItem.node.children.push(currentItem.node);
    } else {
      // Otherwise, this is a root node
      treeRoots.push(currentItem.node);
    }

    // Push the current item onto the stack to act as a potential parent for subsequent items
    stack.push(currentItem);
  }

  return treeRoots;
}
