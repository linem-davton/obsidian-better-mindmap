export interface MindNode {
  id: string; // uuid
  text: string; // heading / bullet text
  link?: string; // obsidian wiki target
  level: number; // 0 = H1 / top bullet
  children: MindNode[];
}
