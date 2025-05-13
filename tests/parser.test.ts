import { describe, it, expect } from "vitest";
import {
  parseOutline,
  parseHeadingLine,
  parseBulletLine,
  indentUnits,
  childId,
} from "../src/parser/parseOutline";
import { MindNode, NodeKind } from "../src/parser/types";

// Helper to generate expected structure with predictable IDs.
function createExpectedNode(
  parentId: string,
  indexInParent: number,
  text: string,
  level: number,
  kind: NodeKind,
  children: MindNode[] = [],
): MindNode {
  return { id: childId(parentId, indexInParent), text, level, kind, children };
}

describe("indentUnits", () => {
  it("should calculate indent units correctly for spaces", () => {
    expect(indentUnits("", 2)).toBe(0);
    expect(indentUnits("  ", 2)).toBe(1);
    expect(indentUnits("   ", 2)).toBe(1); // floor
    expect(indentUnits("    ", 2)).toBe(2);
  });
  it("should handle spacesPerIndent <= 0", () => {
    expect(indentUnits("  ", 0)).toBe(1);
    expect(indentUnits("", 0)).toBe(0);
  });
});

describe("parseHeadingLine", () => {
  it("should parse valid heading lines", () => {
    expect(parseHeadingLine("# H1")).toEqual({ level: 1, text: "H1" });
    expect(parseHeadingLine("### H3 Title")).toEqual({
      level: 3,
      text: "H3 Title",
    });
  });
  it("should return null for invalid or non-heading lines", () => {
    expect(parseHeadingLine("Not a heading")).toBeNull();
    expect(parseHeadingLine("####### H7")).toBeNull();
    expect(parseHeadingLine("#NoSpace")).toBeNull();
  });
});

describe("parseBulletLine", () => {
  const calcIndent = (s: string) => indentUnits(s, 2);
  it("should parse valid bullet lines", () => {
    expect(parseBulletLine("- Item 1", calcIndent)).toEqual({
      indentation: 0,
      text: "Item 1",
    });
    expect(parseBulletLine("  - Nested Item", calcIndent)).toEqual({
      indentation: 1,
      text: "Nested Item",
    });
  });
  it("should return null for non-bullet lines", () => {
    expect(parseBulletLine("Just text", calcIndent)).toBeNull();
  });
});

describe("parseOutline", () => {
  describe("Basic Headings", () => {
    it("should parse a single H1", () => {
      const md = "# H1";
      const expected: MindNode[] = [
        createExpectedNode("root", 0, "H1", 1, "h1"),
      ];
      expect(parseOutline(md)).toEqual(expected);
    });

    it("should parse H1 then H2", () => {
      const md = "# H1\n## H2";
      const h1 = createExpectedNode("root", 0, "H1", 1, "h1");
      const h2 = createExpectedNode(h1.id, 0, "H2", 2, "h2");
      h1.children.push(h2);
      expect(parseOutline(md)).toEqual([h1]);
    });

    it("should parse H1, H2, then another H2 (sibling)", () => {
      const md = "# H1\n## H2a\n## H2b";
      const h1 = createExpectedNode("root", 0, "H1", 1, "h1");
      const h2a = createExpectedNode(h1.id, 0, "H2a", 2, "h2");
      const h2b = createExpectedNode(h1.id, 1, "H2b", 2, "h2");
      h1.children.push(h2a, h2b);
      expect(parseOutline(md)).toEqual([h1]);
    });

    it("should handle heading jumps (H1 then H3)", () => {
      const md = "# H1\n### H3";
      const h1 = createExpectedNode("root", 0, "H1", 1, "h1");
      const h3 = createExpectedNode(h1.id, 0, "H3", 3, "h3");
      h1.children.push(h3);
      expect(parseOutline(md)).toEqual([h1]);
    });

    it("should handle decreasing heading levels (H2 then H1)", () => {
      const md = "## H2\n# H1";
      const h2 = createExpectedNode("root", 0, "H2", 2, "h2");
      const h1 = createExpectedNode("root", 1, "H1", 1, "h1");
      expect(parseOutline(md)).toEqual([h2, h1]);
    });
  });

  describe("Basic Bullets", () => {
    it("should parse a single bullet without a heading (child of root)", () => {
      const md = "- B1";
      // currentHeadingContext=root(lvl0). indent=0. parentTargetLevelInStack=0. parent=root. actualLvl=1.
      const expected: MindNode[] = [
        createExpectedNode("root", 0, "B1", 1, "bullet"),
      ];
      expect(parseOutline(md)).toEqual(expected);
    });

    it("should parse H1 then a bullet", () => {
      const md = "# H1\n- B1";
      const h1 = createExpectedNode("root", 0, "H1", 1, "h1");
      // currentHeadingContext=H1(lvl1). indent=0. parentTargetLevelInStack=1. parent=H1. actualLvl=2.
      const b1 = createExpectedNode(h1.id, 0, "B1", 2, "bullet");
      h1.children.push(b1);
      expect(parseOutline(md)).toEqual([h1]);
    });

    it("should parse H1, bullet, then nested bullet", () => {
      const md = "# H1\n- B1\n  - B1.1";
      const h1 = createExpectedNode("root", 0, "H1", 1, "h1");
      const b1 = createExpectedNode(h1.id, 0, "B1", 2, "bullet");
      // After B1: currentHeadingContext=H1(lvl1). stack=[R,H1,B1(lvl2)]
      // Bullet B1.1 (indent=1): parentTargetLevelInStack=1+1=2. parent=stack[2]=B1. actualLvl=3.
      const b1_1 = createExpectedNode(b1.id, 0, "B1.1", 3, "bullet");
      h1.children.push(b1);
      b1.children.push(b1_1);
      expect(parseOutline(md)).toEqual([h1]);
    });

    it("should parse H1, bullet, nested bullet, then same-level bullet", () => {
      const md = "# H1\n- B1\n  - B1.1\n- B2";
      const h1 = createExpectedNode("root", 0, "H1", 1, "h1");
      const b1 = createExpectedNode(h1.id, 0, "B1", 2, "bullet");
      const b1_1 = createExpectedNode(b1.id, 0, "B1.1", 3, "bullet");
      // After B1.1: currentHeadingContext=H1(lvl1). stack=[R,H1,B1(lvl2),B1.1(lvl3)]
      // Bullet B2 (indent=0): parentTargetLevelInStack=1+0=1. parent=stack[1]=H1. actualLvl=2.
      const b2 = createExpectedNode(h1.id, 1, "B2", 2, "bullet");
      h1.children.push(b1, b2);
      b1.children.push(b1_1);
      expect(parseOutline(md)).toEqual([h1]);
    });
  });

  describe("Mixed Heading and Bullet Cases", () => {
    it("H1, Bullet, then H2 (H2 should be child of H1)", () => {
      const md = "# H1\n- B1\n## H2";
      const h1 = createExpectedNode("root", 0, "H1", 1, "h1");
      const b1 = createExpectedNode(h1.id, 0, "B1", 2, "bullet");
      // After B1: currentHeadingContext=H1(lvl1). stack=[R,H1,B1(lvl2)]
      // Heading H2 (lvl2): parent search -> H1. H2 becomes child of H1. currentHeadingContext=H2. stack=[R,H1,H2(lvl2)]
      const h2 = createExpectedNode(h1.id, 1, "H2", 2, "h2");
      h1.children.push(b1, h2);
      expect(parseOutline(md)).toEqual([h1]);
    });

    it("H1, Bullet, Nested Bullet, then H2 (H2 child of H1)", () => {
      const md = "# H1\n- B1\n  - B1.1\n## H2";
      const h1 = createExpectedNode("root", 0, "H1", 1, "h1");
      const b1 = createExpectedNode(h1.id, 0, "B1", 2, "bullet");
      const b1_1 = createExpectedNode(b1.id, 0, "B1.1", 3, "bullet");
      // After B1.1: currentHeadingContext=H1(lvl1). stack=[R,H1,B1(lvl2),B1.1(lvl3)]
      // Heading H2 (lvl2): parent search -> H1. H2 child of H1. currentHeadingContext=H2. stack=[R,H1,H2(lvl2)]
      const h2 = createExpectedNode(h1.id, 1, "H2", 2, "h2");
      h1.children.push(b1, h2);
      b1.children.push(b1_1);
      expect(parseOutline(md)).toEqual([h1]);
    });
    it("should parse H1, bullet, nested bullet, then same-level bullet", () => {
      const md = "# H1\n- B1\n  - B1.1\n- B2";
      const h1 = createExpectedNode("root", 0, "H1", 1, "h1");
      const b1 = createExpectedNode(h1.id, 0, "B1", 2, "bullet");
      // B1.1 is child of B1
      const b1_1 = createExpectedNode(b1.id, 0, "B1.1", 3, "bullet");
      // B2 is child of H1 (sibling of B1)
      const b2 = createExpectedNode(h1.id, 1, "B2", 2, "bullet");

      h1.children.push(b1, b2); // B1 and B2 are children of H1
      b1.children.push(b1_1); // B1.1 is child of B1

      expect(parseOutline(md)).toEqual([h1]);
    });

    it("Consistent Indentation under heading", () => {
      // This test, from the first response, expects standard list behavior:
      // Subsequent items with same/greater indent become children of previous list item
      const md = "# H1\n  - B1\n  - B2\n    - B2.1";
      const h1_t1 = createExpectedNode("root", 0, "H1", 1, "h1");
      // B1 is child of H1 (due to fallback or direct logic if indent=0 was defined differently)
      // Assuming 2 spaces = 1 indent unit for bullets, "  - B1" means parsedBullet.indentation = 1
      // currentHeadingContext = H1 (level 1)
      // parentTargetLevelInStack = H1.level(1) + B1.indentation(1) = 2
      // stack: [root(0), H1(1)]
      // stack[2] is undefined. Fallback loop: i=min(2, stack.length-1=1)=1.
      //   i=1: parentContextStack[1] is H1. So, parentNode for B1 is H1.
      //   B1.level = H1.level+1 = 2.
      const b1_t1 = createExpectedNode(h1_t1.id, 0, "B1", 2, "bullet");
      h1_t1.children.push(b1_t1); // B1 is child of H1

      // For "  - B2" (indent 1):
      // currentHeadingContext = H1 (level 1)
      // parentTargetLevelInStack = H1.level(1) + B2.indentation(1) = 2
      // stack after B1: [root(0), H1(1), B1(2)]
      // parentContextStack[2] IS B1. B1.level(2) == parentTargetLevelInStack(2). B1.level(2) >= H1.level(1).
      // So, parentNode for B2 IS B1.
      // B2.level = B1.level+1 = 3.
      const b2_t1 = createExpectedNode(b1_t1.id, 0, "B2", 3, "bullet"); // Child of B1
      b1_t1.children.push(b2_t1); // B2 is child of B1

      // For "    - B2.1" (indent 2):
      // currentHeadingContext = H1 (level 1)
      // parentTargetLevelInStack = H1.level(1) + B2.1.indentation(2) = 3
      // stack after B2: [root(0), H1(1), B1(2), B2(3)]
      // parentContextStack[3] IS B2. B2.level(3) == parentTargetLevelInStack(3). B2.level(3) >= H1.level(1).
      // So, parentNode for B2.1 IS B2.
      // B2.1.level = B2.level+1 = 4.
      const b21_t1 = createExpectedNode(b2_t1.id, 0, "B2.1", 4, "bullet"); // Child of B2
      b2_t1.children.push(b21_t1); // B2.1 is child of B2

      expect(parseOutline(md)).toEqual([h1_t1]);
    });

    it("H1, Bullet, then H1 (new top-level H1)", () => {
      const md = "# H1a\n- B1\n# H1b";
      const h1a = createExpectedNode("root", 0, "H1a", 1, "h1");
      const b1 = createExpectedNode(h1a.id, 0, "B1", 2, "bullet");
      h1a.children.push(b1);
      const h1b = createExpectedNode("root", 1, "H1b", 1, "h1");
      expect(parseOutline(md)).toEqual([h1a, h1b]);
    });

    it("Bullet, then H1, then Bullet (bullet context should reset)", () => {
      const md = "- B_root\n# H1\n- B_h1";
      const bRoot = createExpectedNode("root", 0, "B_root", 1, "bullet");
      const h1 = createExpectedNode("root", 1, "H1", 1, "h1");
      const bH1 = createExpectedNode(h1.id, 0, "B_h1", 2, "bullet");
      h1.children.push(bH1);
      expect(parseOutline(md)).toEqual([bRoot, h1]);
    });

    it("H1, H2, Bullet under H2 (indent 1 relative to H2), then H1 (new top-level H1)", () => {
      const md = "# H1a\n## H2\n  - B1\n# H1b"; // Note: '  - B1' is indent 1
      const h1a = createExpectedNode("root", 0, "H1a", 1, "h1");
      const h2 = createExpectedNode(h1a.id, 0, "H2", 2, "h2");
      h1a.children.push(h2);
      const b1 = createExpectedNode(h2.id, 0, "B1", 3, "bullet");
      h2.children.push(b1);
      const h1b = createExpectedNode("root", 1, "H1b", 1, "h1");
      expect(parseOutline(md)).toEqual([h1a, h1b]);
    });

    it("H1, Bullet (indent 0), Bullet (indent 1), H3 (child of H1)", () => {
      const md = "# H1\n- B1 (indent 0)\n  - B1.1 (indent 1)\n### H3";
      const h1 = createExpectedNode("root", 0, "H1", 1, "h1");
      const b1 = createExpectedNode(h1.id, 0, "B1 (indent 0)", 2, "bullet");
      const b1_1 = createExpectedNode(b1.id, 0, "B1.1 (indent 1)", 3, "bullet");
      b1.children.push(b1_1);
      //   H3 becomes child of H1.
      const h3 = createExpectedNode(h1.id, 1, "H3", 3, "h3");
      h1.children.push(b1, h3);
      expect(parseOutline(md)).toEqual([h1]);
    });
  });

  describe("Basic Bullets (Standard Nesting)", () => {
    it("should correctly nest a tab-indented bullet under its parent bullet", () => {
      const md = "- B1\n\t- B1.1"; // Tab before B1.1

      const rootNodeId = "root"; // Or "" if parseOutline returns children of dummy root
      const b1 = createExpectedNode(rootNodeId, 0, "B1", 1, "bullet");
      const b1_1 = createExpectedNode(b1.id, 0, "B1.1", 2, "bullet"); // Child of B1, level 2
      b1.children.push(b1_1);

      // If parseOutline is called with default (rootName="ROOT", id="root")
      // and our createExpectedNode uses "root" for the actual MindMap root,
      // then the first level of nodes (like B1) will have parentId "root".
      const expected: MindNode[] = [b1];

      expect(parseOutline(md)).toEqual(expected);
    });
  });
  describe("Complex Bullet Nesting and Siblings", () => {
    // ... (you might already have the tab-indented test here)

    it("should correctly handle siblings of a nested bullet", () => {
      const md = `
- Parent Bullet (PB)
  - Child Bullet 1 (CB1)
  - Child Bullet 2 (CB2)
- Sibling of Parent Bullet (SPB)
      `.trim(); // Use trim() to remove leading/trailing whitespace from the template literal

      // Expected structure:
      // root
      // ├── PB (level 1)
      // │   ├── CB1 (level 2, child of PB)
      // │   └── CB2 (level 2, child of PB, sibling of CB1)
      // └── SPB (level 1, sibling of PB)

      const rootNodeId = "root"; // Consistent with how parseOutline output is structured (children of a conceptual root)

      const pb = createExpectedNode(
        rootNodeId,
        0,
        "Parent Bullet (PB)",
        1,
        "bullet",
      );
      const cb1 = createExpectedNode(
        pb.id,
        0,
        "Child Bullet 1 (CB1)",
        2,
        "bullet",
      );
      const cb2 = createExpectedNode(
        pb.id,
        1,
        "Child Bullet 2 (CB2)",
        2,
        "bullet",
      ); // Sibling of CB1
      pb.children.push(cb1, cb2);

      const spb = createExpectedNode(
        rootNodeId,
        1,
        "Sibling of Parent Bullet (SPB)",
        1,
        "bullet",
      );

      const expected: MindNode[] = [pb, spb];

      expect(parseOutline(md)).toEqual(expected);
    });

    it("should handle deeper nesting with siblings", () => {
      const md = `
- L1
  - L2 A
    - L3 A.1
    - L3 A.2
    - L3 A.3
  - L2 B
        `.trim();

      const rootNodeId = "root";

      const l1 = createExpectedNode(rootNodeId, 0, "L1", 1, "bullet");
      const l2a = createExpectedNode(l1.id, 0, "L2 A", 2, "bullet");
      const l3a1 = createExpectedNode(l2a.id, 0, "L3 A.1", 3, "bullet");
      const l3a2 = createExpectedNode(l2a.id, 1, "L3 A.2", 3, "bullet"); // Child of L2A
      const l3a3 = createExpectedNode(l2a.id, 2, "L3 A.3", 3, "bullet"); // Child of L2A
      l2a.children.push(l3a1, l3a2, l3a3);

      const l2b = createExpectedNode(l1.id, 1, "L2 B", 2, "bullet"); // Child of L1
      l1.children.push(l2a, l2b);

      const expected: MindNode[] = [l1];
      expect(parseOutline(md)).toEqual(expected);
    });

    it("should handle heading interrupting a list, then new list", () => {
      const md = `
- Item A
  - Item A.1
## New Heading
- Item B
  - Item B.1
        `.trim();

      const rootNodeId = "root";

      const itemA = createExpectedNode(rootNodeId, 0, "Item A", 1, "bullet");
      const itemA1 = createExpectedNode(itemA.id, 0, "Item A.1", 2, "bullet");
      itemA.children.push(itemA1);

      const heading = createExpectedNode(rootNodeId, 1, "New Heading", 2, "h2");
      const itemB = createExpectedNode(heading.id, 0, "Item B", 3, "bullet"); // Child of Heading
      const itemB1 = createExpectedNode(itemB.id, 0, "Item B.1", 4, "bullet"); // Child of Item B
      itemB.children.push(itemB1);
      heading.children.push(itemB);

      const expected: MindNode[] = [itemA, heading];
      expect(parseOutline(md)).toEqual(expected);
    });
  });

  it("should handle sibling bullets after an indent jump correctly", () => {
    // Assuming tab = 4 spaces, spacesPerIndentForBullets = 2 for parseOutline call.
    // So "\t- ..." becomes "    - ..." which is indentation: 2.
    const md = `
- L1
	- L3 A.1
	- L3 A.2
      `.trim();

    const rootNodeId = "root";

    const l1 = createExpectedNode(rootNodeId, 0, "L1", 1, "bullet");
    // L3 A.1 is child of L1, level 2 (due to indent jump)
    const l3a1 = createExpectedNode(l1.id, 0, "L3 A.1", 2, "bullet");
    // L3 A.2 should ALSO be child of L1, level 2 (sibling of L3 A.1)
    const l3a2 = createExpectedNode(l1.id, 1, "L3 A.2", 2, "bullet");
    l1.children.push(l3a1, l3a2);

    const expected: MindNode[] = [l1];
    expect(parseOutline(md)).toEqual(expected);
  });

  describe("Edge Cases and Empty Input", () => {
    it("should return empty array for empty string", () => {
      expect(parseOutline("")).toEqual([]);
    });
    it("should return empty array for string with only whitespace", () => {
      expect(parseOutline("   \n\n  ")).toEqual([]);
    });

    it("Consistent Indentation under heading", () => {
      const md = "# H1\n  - B1\n  - B2\n    - B2.1";
      const h1_t1 = createExpectedNode("root", 0, "H1", 1, "h1");
      const b1_t1 = createExpectedNode(h1_t1.id, 0, "B1", 2, "bullet");
      const b2_t1 = createExpectedNode(b1_t1.id, 0, "B2", 3, "bullet");
      const b21_t1 = createExpectedNode(b2_t1.id, 0, "B2.1", 4, "bullet");
      h1_t1.children.push(b1_t1);
      b1_t1.children.push(b2_t1);
      b2_t1.children.push(b21_t1);
      expect(parseOutline(md)).toEqual([h1_t1]);
    });

    it("Indent jump makes bullet child of current heading", () => {
      const md = "# H1\n    - B_DeepIndent"; // indent 2
      const h1 = createExpectedNode("root", 0, "H1", 1, "h1");
      const bDeep = createExpectedNode(h1.id, 0, "B_DeepIndent", 2, "bullet");
      h1.children.push(bDeep);
      expect(parseOutline(md)).toEqual([h1]);
    });
  });
});
