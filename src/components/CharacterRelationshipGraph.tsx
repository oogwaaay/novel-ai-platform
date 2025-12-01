import { useState, useMemo, useRef, useEffect } from 'react';
import type { Character, CharacterRelationship } from '../types/character';
import { GlassCard } from './ui/GlassCard';
import { PrimaryButton } from './ui/PrimaryButton';
import { SecondaryButton } from './ui/SecondaryButton';

interface CharacterRelationshipGraphProps {
  characters: Character[];
  onCharactersChange: (characters: Character[]) => void;
  open: boolean;
  onClose: () => void;
}

interface GraphNode {
  id: string;
  name: string;
  x: number;
  y: number;
  relationships: CharacterRelationship[];
}

interface GraphEdge {
  from: string;
  to: string;
  relation: string;
  description?: string;
}

// Simple force-directed layout (circular arrangement for simplicity)
function calculateLayout(characters: Character[], width: number, height: number): GraphNode[] {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.35;
  
  if (characters.length === 0) return [];
  if (characters.length === 1) {
    return [{
      id: characters[0].id,
      name: characters[0].name,
      x: centerX,
      y: centerY,
      relationships: characters[0].relationships || []
    }];
  }
  
  const angleStep = (2 * Math.PI) / characters.length;
  
  return characters.map((char, index) => {
    const angle = index * angleStep - Math.PI / 2; // Start from top
    return {
      id: char.id,
      name: char.name,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      relationships: char.relationships || []
    };
  });
}

// Extract edges from character relationships
function extractEdges(characters: Character[]): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const processedPairs = new Set<string>();
  
  characters.forEach(char => {
    if (!char.relationships) return;
    
    char.relationships.forEach(rel => {
      // Create a unique key for the pair (sorted to avoid duplicates)
      const pairKey = [char.id, rel.characterId].sort().join('-');
      
      if (!processedPairs.has(pairKey)) {
        processedPairs.add(pairKey);
        edges.push({
          from: char.id,
          to: rel.characterId,
          relation: rel.relation,
          description: rel.description
        });
      }
    });
  });
  
  return edges;
}

export default function CharacterRelationshipGraph({
  characters,
  onCharactersChange,
  open,
  onClose
}: CharacterRelationshipGraphProps) {
  const [editingRelationship, setEditingRelationship] = useState<{
    fromId: string;
    toId: string;
    relation: string;
    description: string;
  } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const graphWidth = 600;
  const graphHeight = 500;
  const nodeRadius = 40;

  const nodes = useMemo(() => calculateLayout(characters, graphWidth, graphHeight), [characters, graphWidth, graphHeight]);
  const edges = useMemo(() => extractEdges(characters), [characters]);

  const handleAddRelationship = () => {
    if (characters.length < 2) {
      alert('You need at least 2 characters to create a relationship');
      return;
    }
    setShowAddForm(true);
    // If a character is selected, use it as the "from" character
    const fromId = selectedNode || characters[0].id;
    const toId = selectedNode 
      ? characters.find(c => c.id !== fromId)?.id || characters[0].id
      : characters[1]?.id || characters[0].id;
    setEditingRelationship({
      fromId,
      toId,
      relation: '',
      description: ''
    });
  };

  // Auto-scroll to form when it appears
  useEffect(() => {
    if (showAddForm && formRef.current) {
      // Use requestAnimationFrame to ensure DOM has fully updated
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          formRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
          // Add a subtle highlight effect
          formRef.current?.classList.add('ring-2', 'ring-indigo-300', 'ring-offset-2');
          setTimeout(() => {
            formRef.current?.classList.remove('ring-2', 'ring-indigo-300', 'ring-offset-2');
          }, 1500);
        });
      });
    }
  }, [showAddForm]);

  const handleSaveRelationship = () => {
    if (!editingRelationship || !editingRelationship.relation.trim()) return;
    
    const updatedCharacters = characters.map(char => {
      if (char.id === editingRelationship.fromId) {
        const existingRelationships = char.relationships || [];
        // Check if relationship already exists
        const existingIndex = existingRelationships.findIndex(
          r => r.characterId === editingRelationship.toId
        );
        
        const newRelationship: CharacterRelationship = {
          characterId: editingRelationship.toId,
          relation: editingRelationship.relation.trim(),
          description: editingRelationship.description?.trim() || undefined
        };
        
        if (existingIndex >= 0) {
          // Update existing
          existingRelationships[existingIndex] = newRelationship;
        } else {
          // Add new
          existingRelationships.push(newRelationship);
        }
        
        return {
          ...char,
          relationships: existingRelationships,
          updatedAt: Date.now()
        };
      }
      return char;
    });
    
    onCharactersChange(updatedCharacters);
    setEditingRelationship(null);
    setShowAddForm(false);
  };

  const handleDeleteRelationship = (fromId: string, toId: string) => {
    const updatedCharacters = characters.map(char => {
      if (char.id === fromId) {
        return {
          ...char,
          relationships: (char.relationships || []).filter(r => r.characterId !== toId),
          updatedAt: Date.now()
        };
      }
      return char;
    });
    onCharactersChange(updatedCharacters);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <GlassCard
        className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Character Relationship Graph</h2>
            <p className="text-sm text-slate-500 mt-1">Visualize and manage relationships between characters</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {characters.length < 2 ? (
            <div className="text-center py-12">
              <p className="text-sm text-slate-500">Add at least 2 characters to create a relationship graph</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Graph Visualization */}
              <div className="relative border border-slate-200 rounded-lg bg-slate-50 overflow-hidden" style={{ width: graphWidth, height: graphHeight }}>
                <svg width={graphWidth} height={graphHeight} className="absolute inset-0">
                  {/* Draw edges (relationships) */}
                  {edges.map((edge, idx) => {
                    const fromNode = nodes.find(n => n.id === edge.from);
                    const toNode = nodes.find(n => n.id === edge.to);
                    if (!fromNode || !toNode) return null;
                    
                    // Calculate edge path
                    const dx = toNode.x - fromNode.x;
                    const dy = toNode.y - fromNode.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const angle = Math.atan2(dy, dx);
                    
                    // Adjust start and end points to node edges
                    const startX = fromNode.x + nodeRadius * Math.cos(angle);
                    const startY = fromNode.y + nodeRadius * Math.sin(angle);
                    const endX = toNode.x - nodeRadius * Math.cos(angle);
                    const endY = toNode.y - nodeRadius * Math.sin(angle);
                    
                    // Midpoint for label
                    const midX = (startX + endX) / 2;
                    const midY = (startY + endY) / 2;
                    
                    return (
                      <g key={`edge-${idx}`}>
                        <line
                          x1={startX}
                          y1={startY}
                          x2={endX}
                          y2={endY}
                          stroke="#94a3b8"
                          strokeWidth={2}
                          markerEnd="url(#arrowhead)"
                        />
                        <text
                          x={midX}
                          y={midY - 5}
                          textAnchor="middle"
                          className="text-xs fill-slate-600 font-medium pointer-events-none"
                          style={{ fontSize: '10px' }}
                        >
                          {edge.relation}
                        </text>
                      </g>
                    );
                  })}
                  
                  {/* Arrow marker definition */}
                  <defs>
                    <marker
                      id="arrowhead"
                      markerWidth="10"
                      markerHeight="10"
                      refX="9"
                      refY="3"
                      orient="auto"
                    >
                      <polygon points="0 0, 10 3, 0 6" fill="#94a3b8" />
                    </marker>
                  </defs>
                  
                  {/* Draw nodes (characters) */}
                  {nodes.map((node) => {
                    const isSelected = selectedNode === node.id;
                    return (
                      <g key={node.id}>
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={nodeRadius}
                          fill={isSelected ? '#6366f1' : '#ffffff'}
                          stroke={isSelected ? '#4f46e5' : '#cbd5e1'}
                          strokeWidth={isSelected ? 3 : 2}
                          className="cursor-pointer hover:stroke-indigo-400 transition-all"
                          onClick={() => setSelectedNode(isSelected ? null : node.id)}
                        />
                        <text
                          x={node.x}
                          y={node.y}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className={`text-xs font-semibold pointer-events-none ${isSelected ? 'fill-white' : 'fill-slate-900'}`}
                          style={{ fontSize: '11px' }}
                        >
                          {node.name.length > 12 ? node.name.slice(0, 10) + '...' : node.name}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Selected Character Info */}
              {selectedNode && (() => {
                const selectedChar = characters.find(c => c.id === selectedNode);
                if (!selectedChar) return null;
                const relatedEdges = edges.filter(e => e.from === selectedNode || e.to === selectedNode);
                return (
                  <div className="p-4 bg-indigo-50 rounded-lg border-2 border-indigo-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-indigo-900">Selected: {selectedChar.name}</h4>
                      <button
                        onClick={() => setSelectedNode(null)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded border border-indigo-200 hover:bg-indigo-100"
                      >
                        Clear
                      </button>
                    </div>
                    {selectedChar.description && (
                      <p className="text-xs text-indigo-700">{selectedChar.description}</p>
                    )}
                    {relatedEdges.length > 0 && (
                      <p className="text-xs text-indigo-600 pt-1">
                        {relatedEdges.length} relationship{relatedEdges.length > 1 ? 's' : ''} found
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Relationship List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Relationships
                    {selectedNode && (
                      <span className="text-xs text-slate-500 font-normal ml-2">
                        (Highlighting: {characters.find(c => c.id === selectedNode)?.name})
                      </span>
                    )}
                  </h3>
                  <PrimaryButton onClick={handleAddRelationship} className="text-xs px-3 py-1.5 flex items-center gap-1.5">
                    {selectedNode ? (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        Add from {characters.find(c => c.id === selectedNode)?.name}
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Relationship
                      </>
                    )}
                  </PrimaryButton>
                </div>
                
                {edges.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No relationships defined yet</p>
                ) : (
                  <div className="space-y-2">
                    {edges.map((edge, idx) => {
                      const fromChar = characters.find(c => c.id === edge.from);
                      const toChar = characters.find(c => c.id === edge.to);
                      if (!fromChar || !toChar) return null;
                      
                      // Highlight if this relationship involves the selected character
                      const isHighlighted = selectedNode && (edge.from === selectedNode || edge.to === selectedNode);
                      
                      return (
                        <div 
                          key={`rel-${idx}`} 
                          className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                            isHighlighted 
                              ? 'bg-indigo-50 border-indigo-300 shadow-sm' 
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex-1">
                            <p className={`text-sm font-semibold ${
                              isHighlighted ? 'text-indigo-900' : 'text-slate-900'
                            }`}>
                              {fromChar.name} → {toChar.name}
                            </p>
                            <p className={`text-xs mt-1 ${
                              isHighlighted ? 'text-indigo-700' : 'text-slate-600'
                            }`}>
                              <span className="font-medium">{edge.relation}</span>
                              {edge.description && ` · ${edge.description}`}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteRelationship(edge.from, edge.to)}
                            className="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded border border-red-200 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add/Edit Relationship Form */}
              {showAddForm && editingRelationship && (
                <div 
                  ref={formRef}
                  className="p-4 bg-slate-50 rounded-lg border-2 border-indigo-200 shadow-lg space-y-3 transition-all duration-300"
                >
                  <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Relationship
                  </h4>
                  
                  <div>
                    <label className="text-xs text-slate-600 mb-1 block">From Character</label>
                    <select
                      value={editingRelationship.fromId}
                      onChange={(e) => setEditingRelationship({ ...editingRelationship, fromId: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800"
                    >
                      {characters.map(char => (
                        <option key={char.id} value={char.id}>{char.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-xs text-slate-600 mb-1 block">To Character</label>
                    <select
                      value={editingRelationship.toId}
                      onChange={(e) => setEditingRelationship({ ...editingRelationship, toId: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800"
                    >
                      {characters.filter(c => c.id !== editingRelationship.fromId).map(char => (
                        <option key={char.id} value={char.id}>{char.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-xs text-slate-600 mb-1 block">Relationship Type</label>
                    <input
                      type="text"
                      value={editingRelationship.relation}
                      onChange={(e) => setEditingRelationship({ ...editingRelationship, relation: e.target.value })}
                      placeholder="e.g., friend, enemy, lover, mentor"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs text-slate-600 mb-1 block">Description (optional)</label>
                    <textarea
                      value={editingRelationship.description}
                      onChange={(e) => setEditingRelationship({ ...editingRelationship, description: e.target.value })}
                      placeholder="Additional details about the relationship"
                      rows={2}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <PrimaryButton onClick={handleSaveRelationship} className="text-xs px-3 py-1.5">
                      Save
                    </PrimaryButton>
                    <SecondaryButton onClick={() => { setShowAddForm(false); setEditingRelationship(null); }} className="text-xs px-3 py-1.5">
                      Cancel
                    </SecondaryButton>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

