export type UNSNodeKind =
  | 'enterprise'
  | 'site'
  | 'area'
  | 'line'
  | 'cell'
  | 'machine'
  | 'tag';

export interface UNSNode {
  id: string;
  name: string;
  kind: UNSNodeKind;
  children: UNSNode[];
}

export interface UNSGenerationInput {
  enterpriseName: string;
  siteName: string;
  description: string;
}

export interface UNSGenerationResult {
  tree: UNSNode;
  notes: string[];
}
