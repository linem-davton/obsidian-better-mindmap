| Folder           | Responsilbilty                                                               |
| ---------------- | ---------------------------------------------------------------------------- |
| **src/view**     | Only code that touches Obsidian API; keeps plugin glue isolated.             |
| **src/ui**       | Pure React; reusable for future web demo. Holds components.                  |
| **src/state**    | Centralised store enables live sync, collapse, styling.                      |
| **src/parser**   | Handles images/links; serializer writes width attr `{w=180}`.                |
| **src/services** | Long‑running or heavy logic (layout, file sync) decoupled from UI; testable. |
| **tests**        | CI coverage.                                                                 |

obsidian-better-mindmap/
│ manifest.json
│ vite.config.ts
│ tsconfig.json
│ package.json
│ README.md
│
├─ src/ ← all TypeScript / React code
│ ├─ main.tsx ← plugin entry (register view, commands)
│ ├─ view/ ← Obsidian pane implementation
│ │ ├─ ReactMindView.tsx ← wraps React root, handles onOpen/onClose
│ │ └─ SettingsTab.tsx ← plugin settings UI
│ │
│ ├─ ui/ ← purely‐visual React components
│ │ ├─ Canvas/ ← renderer wrapper (ReactFlow or custom)
│ │ │ ├─ MindCanvas.tsx
│ │ │ ├─ Node.tsx
│ │ │ ├─ Edge.tsx
│ │ │ └─ MiniMap.tsx
│ │ └─ Toolbar.tsx
│ │
│ ├─ state/ ← Zustand stores + selectors
│ │ ├─ mindStore.ts
│ │ └─ settingsStore.ts
│ │
│ ├─ parser/ ← Markdown ↔ tree & serializer
│ │ ├─ parseOutline.ts
│ │ ├─ serializeOutline.ts
│ │ └─ types.ts ← `MindNode`, `MindImage`, …
│ │
│ ├─ services/ ← non‑UI helpers
│ │ ├─ SyncController.ts ← file ↔ store debounced sync
│ │ └─ LayoutEngine.ts ← Dagre / worker layout
│ │
│ └─ hooks/ ← shared React hooks
│ └─ useHotkeys.ts
│
├─ public/ ← static assets copied as‑is (icons etc.)
│
├─ tests/ ← vitest unit tests
│ ├─ parser.test.ts
│ └─ store.test.ts
│
└─ .github/
└─ workflows/
└─ ci.yml ← install, lint, test
