// ---------------------------------------------------------------------------------
// I. COMMON TYPES & UTILITIES
// ---------------------------------------------------------------------------------

export type NodeKind =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "bullet"
  | "image"
  | "quote"
  | "code"
  | "task"
  | "link"
  | "unknown"
  | "math";

export interface MindNode {
  id: string;
  text: string;
  level: number;
  kind: NodeKind;
  children: MindNode[];
}
export function childId(parentId: string, index: number): string {
  return parentId ? `${parentId}-${index}` : `${index}`;
}

export function indentUnits(
  indentStr: string,
  spacesPerIndent: number = 2,
): number {
  if (spacesPerIndent <= 0) {
    return indentStr.length > 0 ? 1 : 0;
  }
  return Math.floor(indentStr.length / spacesPerIndent);
}

// ---------------------------------------------------------------------------------
// II. HEADING PARSER
// ---------------------------------------------------------------------------------

export interface ParsedHeading {
  text: string;
  level: number;
}

export function parseHeadingLine(line: string): ParsedHeading | null {
  const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
  if (headingMatch) {
    return {
      level: headingMatch[1].length,
      text: headingMatch[2].trim(),
    };
  }
  return null;
}

// ---------------------------------------------------------------------------------
// III. BULLET PARSER
// ---------------------------------------------------------------------------------

export interface ParsedBullet {
  text: string;
  indentation: number;
}

export function parseBulletLine(
  line: string,
  calculateIndentFn: (indentStr: string) => number,
): ParsedBullet | null {
  const bulletMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
  if (bulletMatch) {
    return {
      indentation: calculateIndentFn(bulletMatch[1]),
      text: bulletMatch[2].trim(),
    };
  }
  return null;
}

// ---------------------------------------------------------------------------------
// IV. MAIN OUTLINE PARSER (Refactored with fix for heading discontinuity)
// ---------------------------------------------------------------------------------

export function parseOutline(
  md: string,
  spacesPerIndentForBullets: number = 2,
): MindNode[] {
  const root: MindNode = { id: "", text: "ROOT", level: 0, children: [] };
  const stack: MindNode[] = [root]; // stack[0] is root. stack[level] is last node at that tree level.
  let bulletBaseDepth = 1; // Default level for a 0-indent bullet if no preceding heading.
  // More accurately: stack[bulletBaseDepth-1] is the heading owning current bullets.

  const calculateBulletIndent = (s: string) =>
    indentUnits(s, spacesPerIndentForBullets);

  md.split("\n").forEach((rawLine) => {
    const line = rawLine.trimEnd();
    if (!line) return;

    const parsedHeading = parseHeadingLine(line);
    if (parsedHeading) {
      const newHeadingNodeLevel = parsedHeading.level; // This is Hx level (1-6) and target tree level.
      let determinedParentNode = root;

      // 1. Find the closest structural ancestor level in the current stack.
      let structuralParentCandidateActualLevel = -1; // The actual tree level of the candidate.
      for (let lvl = newHeadingNodeLevel - 1; lvl >= 0; lvl--) {
        if (stack[lvl]) {
          structuralParentCandidateActualLevel = lvl;
          break;
        }
      }

      if (structuralParentCandidateActualLevel === -1) {
        // No ancestor other than root found (e.g. first H1).
        determinedParentNode = root;
      } else {
        const structuralParentCandidateNode =
          stack[structuralParentCandidateActualLevel];

        // 2. Check if this structural parent is part of a "too deep" bullet context
        //    relative to the new heading.
        const owningHeadingNodeForCurrentBullets = stack[bulletBaseDepth - 1];

        // Conditions for new heading to attach to owningHeadingNodeForCurrentBullets:
        // a) There IS an owning heading for the current bullet context.
        // b) The structural parent candidate is AT or DEEPER than this owning heading.
        // c) The structural parent candidate is NOT the owning heading itself (i.e., it's likely a bullet).
        // d) The new heading is intended to be DEEPER than the owning heading.
        if (
          owningHeadingNodeForCurrentBullets &&
          structuralParentCandidateNode.level >=
            owningHeadingNodeForCurrentBullets.level &&
          structuralParentCandidateNode !==
            owningHeadingNodeForCurrentBullets &&
          newHeadingNodeLevel > owningHeadingNodeForCurrentBullets.level
        ) {
          // The new heading should attach to the owningHeadingNodeForCurrentBullets,
          // effectively "breaking out" of the bullet list.
          // We must also ensure owningHeadingNodeForCurrentBullets.level < newHeadingNodeLevel for valid parenting.
          if (owningHeadingNodeForCurrentBullets.level < newHeadingNodeLevel) {
            determinedParentNode = owningHeadingNodeForCurrentBullets;
          } else {
            // This is an edge case, e.g., H2, then its bullet B1 (level 3), then a new H2.
            // owningHeadingNodeForCurrentBullets.level (2) is NOT < newHeadingNodeLevel (2).
            // In this scenario, the structuralParentCandidateNode (which would be H2's parent) is correct.
            determinedParentNode = structuralParentCandidateNode;
          }
        } else {
          // Standard case: structural parent is suitable, or new heading is shallower than current bullet context.
          determinedParentNode = structuralParentCandidateNode;
        }
      }

      const index = determinedParentNode.children.length;
      const node: MindNode = {
        id: childId(determinedParentNode.id, index),
        text: parsedHeading.text,
        level: newHeadingNodeLevel,
        kind: `h${newHeadingNodeLevel}` as NodeKind,
        children: [],
      };

      determinedParentNode.children.push(node);

      stack[newHeadingNodeLevel] = node;
      // Crucially, prune the stack deeper than the new heading. This closes off old branches.
      stack.length = newHeadingNodeLevel + 1;
      // Subsequent bullets will be children of this new heading.
      bulletBaseDepth = newHeadingNodeLevel + 1;
      return; // Line processed as a heading
    }

    const parsedBullet = parseBulletLine(line, calculateBulletIndent);
    if (parsedBullet) {
      let bulletNodeLevel = bulletBaseDepth + parsedBullet.indentation;

      if (bulletNodeLevel >= stack.length && stack.length > 0) {
        bulletNodeLevel = stack.length;
      } else if (bulletNodeLevel <= 0) {
        bulletNodeLevel = 1;
      }

      const parentIndex = Math.max(0, bulletNodeLevel - 1);
      const parentNode = stack[parentIndex] || root;

      const index = parentNode.children.length;
      const node: MindNode = {
        id: childId(parentNode.id, index),
        text: parsedBullet.text,
        level: bulletNodeLevel,
        kind: "bullet",
        children: [],
      };

      parentNode.children.push(node);

      stack[bulletNodeLevel] = node;
      stack.length = bulletNodeLevel + 1;
    }
  });

  return root.children;
}
