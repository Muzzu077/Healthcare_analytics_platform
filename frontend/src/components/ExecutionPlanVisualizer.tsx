import React, { useState } from 'react';
import { ExecutionPlanNode } from '../types';
import { Database, Zap, Layers, Filter, Search, ChevronRight, ChevronDown, Cpu, Clock, AlertTriangle } from 'lucide-react';

interface Props {
  node: ExecutionPlanNode;
  depth?: number;
}

export const ExecutionPlanVisualizer: React.FC<Props> = ({ node, depth = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!node) return <div className="text-[#1E3F20]/50 text-sm">No execution plan tree available.</div>;

  const nodeType = node["Node Type"] || "Unknown";
  const relation = node["Relation Name"];
  const alias = node["Alias"];
  const indexName = node["Index Name"];
  const totalCost = node["Total Cost"] ?? 0;
  const actualTime = node["Actual Total Time"] ?? 0;
  const actualRows = node["Actual Rows"] ?? node["Plan Rows"] ?? 0;
  const filterCond = node["Filter"] || node["Index Cond"];
  const children = node["Plans"] || [];

  const getNodeColor = (type: string) => {
    if (type.includes("Seq Scan")) return "border-[#D4A017]/30 bg-[#D4A017]/5 text-[#1E3F20]";
    if (type.includes("Index Scan") || type.includes("Bitmap Scan")) return "border-[#3D7A4A]/30 bg-[#3D7A4A]/5 text-[#1E3F20]";
    if (type.includes("Join") || type.includes("Loop")) return "border-[#557A61]/30 bg-[#557A61]/5 text-[#1E3F20]";
    if (type.includes("Aggregate") || type.includes("Sort")) return "border-[#A2B7A7]/40 bg-[#A2B7A7]/10 text-[#1E3F20]";
    return "border-[#A2B7A7]/30 bg-white text-[#1E3F20]";
  };

  const getIcon = (type: string) => {
    if (type.includes("Seq Scan")) return <AlertTriangle className="w-4 h-4 text-[#D4A017]" />;
    if (type.includes("Index")) return <Zap className="w-4 h-4 text-[#3D7A4A]" />;
    if (type.includes("Join")) return <Layers className="w-4 h-4 text-[#557A61]" />;
    if (type.includes("Sort") || type.includes("Aggregate")) return <Cpu className="w-4 h-4 text-[#557A61]" />;
    return <Database className="w-4 h-4 text-[#A2B7A7]" />;
  };

  return (
    <div className="my-2" style={{ marginLeft: `${depth * 20}px` }}>
      <div className={`p-4 rounded-xl border transition-all ${getNodeColor(nodeType)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {children.length > 0 && (
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 hover:bg-[#F4F7F5] rounded text-[#557A61] hover:text-[#1E3F20]"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            )}
            {getIcon(nodeType)}
            <div>
              <span className="font-semibold text-sm tracking-wide text-[#1E3F20]">{nodeType}</span>
              {relation && (
                <span className="ml-2 px-2 py-0.5 rounded text-xs bg-[#E8F0EA] text-[#557A61] font-mono border border-[#A2B7A7]/30">
                  on {relation} {alias ? `(${alias})` : ''}
                </span>
              )}
              {indexName && (
                <span className="ml-2 px-2 py-0.5 rounded text-xs bg-[#3D7A4A]/10 text-[#3D7A4A] font-mono border border-[#3D7A4A]/30">
                  idx: {indexName}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1 text-[#1E3F20]/70">
              <Cpu className="w-3.5 h-3.5 text-[#557A61]" />
              <span>Cost: <strong className="text-[#557A61]">{totalCost.toFixed(2)}</strong></span>
            </div>
            <div className="flex items-center gap-1 text-[#1E3F20]/70">
              <Clock className="w-3.5 h-3.5 text-[#557A61]" />
              <span>Time: <strong className="text-[#1E3F20]">{actualTime.toFixed(3)} ms</strong></span>
            </div>
            <div className="flex items-center gap-1 text-[#1E3F20]/70">
              <Filter className="w-3.5 h-3.5 text-[#557A61]" />
              <span>Rows: <strong className="text-[#1E3F20]">{actualRows}</strong></span>
            </div>
          </div>
        </div>

        {filterCond && (
          <div className="mt-3 p-2 rounded bg-[#F4F7F5] border border-[#A2B7A7]/30 text-xs font-mono text-[#1E3F20]/70 flex items-start gap-2">
            <Search className="w-3.5 h-3.5 text-[#D4A017] mt-0.5 shrink-0" />
            <span className="break-all"><strong className="text-[#1E3F20]">Predicate/Index Cond:</strong> {filterCond}</span>
          </div>
        )}
      </div>

      {isExpanded && children.length > 0 && (
        <div className="border-l-2 border-[#A2B7A7]/40 ml-4 pl-2 mt-1 space-y-1">
          {children.map((childNode, idx) => (
            <ExecutionPlanVisualizer key={idx} node={childNode} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};
