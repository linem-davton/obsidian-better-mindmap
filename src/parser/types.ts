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
  | "unknown" // For root or other unclassified nodes
  | "math";

export interface MindNode {
  id: string;
  text: string;
  level: number; // Tree depth level (root is 0, H1 is 1, its child bullet is 2)
  kind: NodeKind;
  children: MindNode[];
}

export interface ParsedHeading {
  text: string;
  level: number; // Markdown heading level (1-6)
}

export interface ParsedBullet {
  text: string;
  indentation: number; // Indentation units (0, 1, 2...)
}
