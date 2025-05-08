import React from "react";
import ReactMarkdown from "react-markdown";
import gfm from "remark-gfm";
import { Handle, Position } from "reactflow";

export default function MarkdownNode({ data }) {
  return (
    <div className="mindnode">
      {/* invisible handles keep ReactFlow happy */}
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <ReactMarkdown remarkPlugins={[gfm]}>{data.label}</ReactMarkdown>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}
