import { MindNode, NodeKind, ParsedHeading, ParsedBullet } from "./types";

// UTILITIES
export function childId(parentId: string, index: number): string {
  const effectiveParentId =
    parentId === "root" || !parentId ? "root" : parentId;
  if (effectiveParentId === "root" && parentId === "") return `${index}`;
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

// PARSERS
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

// MAIN OUTLINE PARSER
export function parseOutline(
  md: string,
  spacesPerIndentForBullets: number = 2,
): MindNode[] {
  const root: MindNode = {
    id: "root",
    text: "ROOT",
    level: 0,
    kind: "unknown",
    children: [],
  };
  const parentContextStack: MindNode[] = [root];
  let currentHeadingContext: MindNode = root;

  const calculateBulletIndent = (s: string) =>
    indentUnits(s, spacesPerIndentForBullets);
  const tabWidth = 4;
  const lines = md.split("\n");

  for (const rawLine of lines) {
    const tabLine = rawLine.replace(/\t/g, " ".repeat(tabWidth));
    const line = tabLine.trimEnd();
    if (!line) continue;

    const parsedHeading = parseHeadingLine(line);
    if (parsedHeading) {
      const headingMarkdownLevel = parsedHeading.level;
      const nodeTreeLevel = headingMarkdownLevel;

      let parentNodeForHeading = root;
      for (
        let i = Math.min(nodeTreeLevel - 1, parentContextStack.length - 1);
        i >= 0;
        i--
      ) {
        const candidate = parentContextStack[i];
        if (candidate) {
          if (
            (candidate.kind === "unknown" || candidate.kind.startsWith("h")) &&
            candidate.level < nodeTreeLevel
          ) {
            parentNodeForHeading = candidate;
            break;
          }
        }
      }

      const newHeadingNode: MindNode = {
        id: childId(
          parentNodeForHeading.id,
          parentNodeForHeading.children.length,
        ),
        text: parsedHeading.text,
        level: nodeTreeLevel,
        kind: `h${headingMarkdownLevel}` as NodeKind,
        children: [],
      };

      parentNodeForHeading.children.push(newHeadingNode);
      parentContextStack[nodeTreeLevel] = newHeadingNode;
      parentContextStack.length = nodeTreeLevel + 1;
      currentHeadingContext = newHeadingNode;
      continue;
    }

    const parsedBullet = parseBulletLine(line, calculateBulletIndent);
    if (parsedBullet) {
      // This is the stack index where the parent of a bullet with this indentation *would normally be found*.
      // It's based on the bullet's indentation relative to the current heading.
      const expectedParentStackIndex =
        currentHeadingContext.level + parsedBullet.indentation;
      let determinedParent: MindNode = currentHeadingContext; // Default parent

      // Scenario 1: A valid parent candidate exists at the expectedParentStackIndex
      if (
        expectedParentStackIndex < parentContextStack.length &&
        parentContextStack[expectedParentStackIndex]
      ) {
        const candidateAtStackIndex =
          parentContextStack[expectedParentStackIndex];

        if (
          candidateAtStackIndex.level === expectedParentStackIndex && // Structural integrity
          candidateAtStackIndex.level >= currentHeadingContext.level
        ) {
          // Is within current heading's branch

          // Now, decide if candidateAtStackIndex is the direct parent, or if current bullet is its sibling
          if (candidateAtStackIndex.kind === "bullet") {
            // The item at the "parent slot" is another bullet (e.g., L3 A.1).
            // If the current bullet (e.g., L3 A.2) has the same or shallower effective indentation
            // than this candidate bullet (L3 A.1), it should be a sibling to L3 A.1.
            // This means its parent is L3 A.1's parent (e.g., L1).
            // We check if L3 A.1 is NOT a "more deeply nested structure" than L3 A.2 implies.
            // A simple proxy: if current bullet's `parsedBullet.indentation` is not greater
            // than candidate's `indentation` (if we had it).
            // The current `expectedParentStackIndex` *is* the level of the candidate.
            // If this candidate bullet is at the *exact level* our current bullet expects its parent to be,
            // it implies our current bullet wants to be a sibling of this candidate.
            // So, the actual parent is one level shallower in the stack.
            if (
              expectedParentStackIndex > currentHeadingContext.level && // Ensure parent is not heading itself unless indent=0
              parentContextStack[expectedParentStackIndex - 1]
            ) {
              // And that shallower parent exists
              determinedParent =
                parentContextStack[expectedParentStackIndex - 1];
            } else {
              // This case means candidateAtStackIndex is L1 (indent 0) for an indent 1 bullet
              // or currentHeadingContext if expectedParentStackIndex - 1 is invalid.
              determinedParent = candidateAtStackIndex; // Fallback to the candidate if shallower parent doesn't make sense
            }
          } else {
            // Candidate is the currentHeadingContext or some other non-bullet element.
            // This is the direct parent.
            determinedParent = candidateAtStackIndex;
          }
        } else {
          // Candidate at stack index is not valid (e.g., wrong level, or from different branch).
          // Fallback: search upwards from expectedParentStackIndex.
          for (
            let i = Math.min(
              expectedParentStackIndex,
              parentContextStack.length - 1,
            );
            i >= currentHeadingContext.level;
            i--
          ) {
            if (parentContextStack[i] && parentContextStack[i].level === i) {
              // Check integrity
              determinedParent = parentContextStack[i];
              break;
            }
          }
        }
      } else {
        // Scenario 2: Stack is not deep enough for expectedParentStackIndex (initial indent jump like L3 A.1)
        // or the slot is empty.
        // Fallback: search upwards from where the parent was expected or end of stack.
        for (
          let i = Math.min(
            expectedParentStackIndex,
            parentContextStack.length - 1,
          );
          i >= currentHeadingContext.level;
          i--
        ) {
          if (parentContextStack[i] && parentContextStack[i].level === i) {
            // Check integrity
            determinedParent = parentContextStack[i];
            break;
          }
        }
      }

      // Final safety check for determinedParent
      if (
        !determinedParent ||
        determinedParent.level >
          currentHeadingContext.level + parsedBullet.indentation
      ) {
        // If determinedParent is deeper than allowed or null, default to currentHeadingContext
        // or the deepest valid item in stack.
        determinedParent = currentHeadingContext;
        for (
          let i = Math.min(
            currentHeadingContext.level + parsedBullet.indentation,
            parentContextStack.length - 1,
          );
          i >= currentHeadingContext.level;
          i--
        ) {
          if (parentContextStack[i] && parentContextStack[i].level === i) {
            determinedParent = parentContextStack[i];
            break;
          }
        }
      }

      const actualBulletNodeLevel = determinedParent.level + 1;

      const newBulletNode: MindNode = {
        // CORRECTED: Use determinedParent
        id: childId(determinedParent.id, determinedParent.children.length),
        text: parsedBullet.text,
        level: actualBulletNodeLevel,
        kind: "bullet",
        children: [],
      };

      // CORRECTED: Use determinedParent
      determinedParent.children.push(newBulletNode);
      parentContextStack[actualBulletNodeLevel] = newBulletNode;
      parentContextStack.length = actualBulletNodeLevel + 1;
      continue;
    }
  }
  return root.children;
}
