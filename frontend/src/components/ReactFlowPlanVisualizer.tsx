import React, { useState, useMemo } from 'react';
import { ReactFlow, Background, Controls, Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ExecutionPlanNode } from '../types';
import { AlertTriangle, Zap, Database, Cpu, Search, CheckCircle2, Clock, Layers, HardDrive } from 'lucide-react';

interface Props {
  planTree: ExecutionPlanNode;
}

interface CustomNodeData extends Record<string, unknown> {
  nodeType: string;
  relation?: string;
  alias?: string;
  indexName?: string;
  cost: number;
  time: number;
  actualRows: number;
  planRows: number;
  filter?: string;
  buffersHit?: number;
  buffersRead?: number;
  isBottleneck: boolean;
  isIndexScan: boolean;
  rawNode: ExecutionPlanNode;
}

export const ReactFlowPlanVisualizer: React.FC<Props> = ({ planTree }) => {
  const [selectedNodeData, setSelectedNodeData] = useState<CustomNodeData | null>(null);

  // Layout plan tree into ReactFlow nodes and edges
  const { nodes, edges } = useMemo(() => {
    const nList: Node<CustomNodeData>[] = [];
    const eList: Edge[] = [];
    let idCounter = 1;

    function traverse(node: ExecutionPlanNode, x: number, y: number, parentId: string | null = null): string {
      const currentId = `node_${idCounter++}`;
      const nodeType = node["Node Type"] || "Unknown";
      const relation = node["Relation Name"];
      const alias = node["Alias"];
      const indexName = node["Index Name"];
      const totalCost = node["Total Cost"] ?? 0;
      const actualTime = node["Actual Total Time"] ?? 0;
      const actualRows = node["Actual Rows"] ?? 0;
      const planRows = node["Plan Rows"] ?? 0;
      const filter = node["Filter"] || node["Index Cond"];
      const buffersHit = node["Shared Hit Blocks"] ?? 0;
      const buffersRead = node["Shared Read Blocks"] ?? 0;

      const isBottleneck = nodeType.includes("Seq Scan") || totalCost > 80;
      const isIndexScan = nodeType.includes("Index Scan") || nodeType.includes("Index Only Scan");

      const nodeData: CustomNodeData = {
        nodeType,
        relation,
        alias,
        indexName,
        cost: totalCost,
        time: actualTime,
        actualRows,
        planRows,
        filter,
        buffersHit,
        buffersRead,
        isBottleneck,
        isIndexScan,
        rawNode: node
      };

      nList.push({
        id: currentId,
        position: { x, y },
        data: nodeData,
        style: {
          background: '#ffffff',
          border: '1px solid #E2E8F0',
          borderLeft: isBottleneck ? '4px solid #B45309' : isIndexScan ? '4px solid #0E7490' : '1px solid #E2E8F0',
          borderRadius: '10px',
          padding: '12px',
          color: '#0F172A',
          width: 240,
          boxShadow: '0 2px 4px rgba(15, 23, 42, 0.04)',
          fontFamily: 'Inter, system-ui, sans-serif'
        }
      });

      if (parentId) {
        eList.push({
          id: `edge_${parentId}_${currentId}`,
          source: parentId,
          target: currentId,
          animated: true,
          style: { stroke: '#94A3B8', strokeWidth: 2 }
        });
      }

      const children = node["Plans"] || [];
      if (children.length > 0) {
        const stepX = 280;
        const startX = x - ((children.length - 1) * stepX) / 2;
        children.forEach((child, idx) => {
          traverse(child, startX + idx * stepX, y + 150, currentId);
        });
      }

      return currentId;
    }

    if (planTree) {
      traverse(planTree, 400, 30);
    }

    return { nodes: nList, edges: eList };
  }, [planTree]);

  return (
    <div className="space-y-4 font-sans">
      <div className="h-[480px] w-full rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] overflow-hidden relative shadow-inner">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={(_, node) => setSelectedNodeData(node.data as CustomNodeData)}
          fitView
        >
          <Background color="#CBD5E1" gap={16} />
          <Controls />
        </ReactFlow>

        {/* Legend */}
        <div className="absolute top-4 left-4 p-3 rounded-xl bg-white/95 backdrop-blur-xs text-[11px] font-mono space-y-1 z-10 border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-2 text-[#B45309]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B45309]" />
            <span>Amber: Sequential Scan / Bottleneck</span>
          </div>
          <div className="flex items-center gap-2 text-[#0E7490]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0E7490]" />
            <span>Teal: Index Scan / B-Tree Lookup</span>
          </div>
        </div>
      </div>

      {/* Node Inspector Drawer */}
      {selectedNodeData && (
        <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] shadow-md space-y-3 text-xs animate-fade-in">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div className="flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-[#0E7490]" />
              <span className="text-sm font-bold text-[#163A5F]">{selectedNodeData.nodeType}</span>
              {selectedNodeData.relation && (
                <span className="px-2 py-0.5 rounded font-mono bg-[#EFF6FF] text-[#1F4E79] border border-[#E2E8F0]">
                  Table: {selectedNodeData.relation}
                </span>
              )}
              {selectedNodeData.indexName && (
                <span className="px-2 py-0.5 rounded font-mono bg-[#F0FDF4] text-[#15803D] border border-[#15803D]/20">
                  Index: {selectedNodeData.indexName}
                </span>
              )}
            </div>
            <button
              onClick={() => setSelectedNodeData(null)}
              className="text-[#64748B] hover:text-[#0F172A] font-semibold"
            >
              ✕ Close Inspector
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
            <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-[#64748B] block text-[10px]">TOTAL ESTIMATED COST:</span>
              <strong className="text-[#163A5F] text-sm">{selectedNodeData.cost.toFixed(1)}</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-[#64748B] block text-[10px]">ACTUAL TIME:</span>
              <strong className="text-[#0E7490] text-sm">{selectedNodeData.time.toFixed(3)} ms</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-[#64748B] block text-[10px]">ACTUAL ROWS:</span>
              <strong className="text-[#0F172A] text-sm">{selectedNodeData.actualRows}</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-[#64748B] block text-[10px]">PLAN ROWS:</span>
              <strong className="text-[#0F172A] text-sm">{selectedNodeData.planRows}</strong>
            </div>
          </div>

          {selectedNodeData.filter && (
            <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] flex items-start gap-2 font-mono">
              <Search className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#0E7490]" />
              <span><strong>Execution Filter Predicate:</strong> {selectedNodeData.filter}</span>
            </div>
          )}

          {selectedNodeData.isBottleneck && (
            <div className="p-3 rounded-lg bg-[#FFFBEB] border border-[#B45309]/30 text-[#B45309] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span><strong>Optimization Target:</strong> Full relation sequential scan. Adding a targeted composite index will convert this node into an indexed B-tree scan.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
