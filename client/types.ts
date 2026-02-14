
export interface Node {
  id: string;
  label: string;
  type: 'Paper' | 'Author' | 'Concept' | 'Method' | 'Result' | 'Dataset' | 'Problem';
  description?: string;
  // d3 properties
  index?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface Link {
  source: string;   // always id
  target: string;   // always id
  relationship: string;
}
export interface GraphData {
  nodes: Node[];
  links: Link[];
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoningTrace?: string[];
}

export interface ExtractionResult {
  nodes: Node[];
  links: Link[];
}
