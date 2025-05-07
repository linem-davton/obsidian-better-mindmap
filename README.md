# Better‑Mindmap (React) — Obsidian Plugin

Interactive, **hierarchical mind‑map** view for any Markdown note.  
Built from scratch with ReactFlow and D3‑hierarchy; supports headings + bullet lists, instant refresh when you switch notes, zoom/pan, and draggable nodes.


## Features (v1)

-  **Live graph** of the current note (headings & nested bullet points) 
- Automatic refresh when the focused editor pane changes
- Smooth pan / zoom (trackpad & mouse‑wheel)
- Drag nodes to explore large maps                                     
- Tidy textbook layout (Reingold–Tilford tree)
- Dark‑ & light‑theme aware                                            

**Road‑map: wiki‑links, YAML relations, collapsible sub‑trees, node styling**


## Installation

### Manual

1. **Download** or build `main.js` + `styles.css`.
2. Copy both files **and** `manifest.json` into {your‑vault}/.obsidian/plugins/better‑mindmap/

3. In Obsidian ⇒ **Settings → Community plugins**
   - Disable Safe Mode
   - Enable **Better‑Mindmap**
4. Open any Markdown file → Command Palette ► **Open Mind‑Map**.



## Usage

| Action  | Gesture                                     |
| ------- | ------------------------------------------- |
| Pan     | Drag blank canvas                           |
| Zoom    | Mouse‑wheel / trackpad pinch                |
| Center  | `Fit View` button (top‑left)                |
| Refresh | Mind‑map auto‑updates when you switch notes |



## Build from source

```bash
git clone https://github.com/yourname/obsidian-better-mindmap.git
cd obsidian-better-mindmap
npm install
npm run build      # outputs main.js + styles.css in /build


scripts/
  dev   – Vite watch build
  build – production bundle
  test  – vitest unit tests
```

## External libraries

| Lib                                                    | Purpose                        | License    |
| ------------------------------------------------------ | ------------------------------ | ---------- |
| [**React** 18](https://react.dev/)                     | UI framework                   | MIT        |
| [**ReactFlow**](https://reactflow.dev/)                | Canvas, pan/zoom, edge routing | MIT        |
| [**D3‑hierarchy**](https://github.com/d3/d3-hierarchy) | Reingold–Tilford tree layout   | ISC        |
| [**Vite**](https://vitejs.dev/)                        | Build tool (lib mode)          | MIT        |
| [**TypeScript**](https://www.typescriptlang.org/)      | Static typing                  | Apache‑2.0 |
| *Dev* — **Vitest**, **ESLint**                         | Unit tests & linting           | MIT        |


## Contributing

- Fork → feature branch (feat/<xyz>).

- npm run dev and open the demo vault to test.

- Submit a PR with concise description + screenshots.

- CI (GitHub Actions) runs linter + unit tests.

## License

MIT © 2025 Utkarsh Raj
