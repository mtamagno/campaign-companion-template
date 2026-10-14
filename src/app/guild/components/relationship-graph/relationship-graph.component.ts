/**
 * Shared relationship graph component.
 * Renders nodes (characters/NPCs) in a circular layout with SVG edges.
 * Reused by both party-relationships and npc-relationships pages.
 * Supports focus mode: clicking a node centers it and dims unrelated connections.
 */

import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  signal,
  computed,
  output,
  type InputSignal,
  type Signal,
  type WritableSignal,
  type OutputEmitterRef,
} from '@angular/core';

import {
  type RelationshipNode,
  type Relationship,
  type RelationshipType,
  RELATIONSHIP_TYPE_LABELS,
  RELATIONSHIP_TYPE_EMOJIS,
  NODE_TYPES,
} from '@guild/models/relationship.model';
import { BilingualTextPipe } from '@guild/components/bilingual-text/bilingual-text.pipe';
import { LanguageService } from '@guild/services/language.service';
import { localizeText } from '@guild/models/language.model';

/** Layout position for a graph node. */
interface NodePosition {
  readonly node: RelationshipNode;
  readonly x: number;
  readonly y: number;
}

/** Computed edge between two positioned nodes. */
interface EdgeLayout {
  readonly relationship: Relationship;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly labelX: number;
  readonly labelY: number;
}

/** Color mapping for relationship types. */
const RELATIONSHIP_COLORS: Record<RelationshipType, string> = {
  friendship: '#3da34e',
  rivalry: '#d99a2a',
  alliance: '#3a7ab8',
  romance: '#cc4488',
  family: '#8b6b5a',
  mentor: '#7a4acc',
  enemy: '#cc4444',
  neutral: '#6a6458',
  distrust: '#b87d1e',
  respect: '#e8c84a',
};

/** Node radius in SVG units. */
const NODE_RADIUS = 40;

/** Graph container padding. */
const GRAPH_PADDING = 80;

/**
 * Visual relationship graph with circular node layout.
 * Supports focus mode: clicking a node centers it and highlights only its connections.
 */
@Component({
  selector: 'app-relationship-graph',
  standalone: true,
  imports: [BilingualTextPipe],
  templateUrl: './relationship-graph.component.html',
  styleUrl: './relationship-graph.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RelationshipGraphComponent {
  private readonly languageService = inject(LanguageService);

  /** Current language for graph controls, labels, and empty states. */
  readonly lang = this.languageService.currentLanguage;

  /** Graph nodes (characters/NPCs). */
  readonly nodes: InputSignal<ReadonlyArray<RelationshipNode>> =
    input.required<ReadonlyArray<RelationshipNode>>();

  /** Relationships (edges) between nodes. */
  readonly relationships: InputSignal<ReadonlyArray<Relationship>> =
    input.required<ReadonlyArray<Relationship>>();

  /** Optional title for the graph. */
  readonly graphTitle: InputSignal<string> = input<string>('');

  /** The currently hovered edge (for tooltip display). */
  readonly hoveredEdge: WritableSignal<EdgeLayout | undefined> = signal(undefined);

  /** The ID of the currently focused node, or undefined if no focus is active. */
  readonly focusedNodeId: WritableSignal<string | undefined> = signal(undefined);

  /** Whether the focus mini-tooltip is visible (can be dismissed by user). */
  readonly focusTooltipVisible: WritableSignal<boolean> = signal(false);

  /** Emitted when a user clicks on a relationship edge. */
  readonly edgeClick: OutputEmitterRef<Relationship> = output<Relationship>();

  /** Emitted when a user clicks the "View Profile" link in the focus tooltip. */
  readonly nodeProfileNavigate: OutputEmitterRef<RelationshipNode> = output<RelationshipNode>();

  /** SVG viewBox dimensions based on node count. */
  readonly viewBoxSize: Signal<number> = computed(() => {
    const count = this.nodes().length;
    // Scale viewBox for readability
    const base = 400;
    const perNode = 60;
    return Math.max(base, base + (count - 3) * perNode);
  });

  /** Center coordinate. */
  readonly center: Signal<number> = computed(() => this.viewBoxSize() / 2);

  /** Radius of the circular layout. */
  readonly layoutRadius: Signal<number> = computed(
    () => this.viewBoxSize() / 2 - GRAPH_PADDING - NODE_RADIUS,
  );

  /** Nodes positioned in a circle. */
  readonly nodePositions: Signal<ReadonlyArray<NodePosition>> = computed(() => {
    const allNodes = this.nodes();
    const cx = this.center();
    const cy = this.center();
    const radius = this.layoutRadius();
    const count = allNodes.length;

    if (count === 0) {
      return [];
    }

    // Single node at center
    if (count === 1) {
      return [{ node: allNodes[0], x: cx, y: cy }];
    }

    const angleStep = (2 * Math.PI) / count;
    // Start from top (-PI/2) for aesthetic placement
    const startAngle = -Math.PI / 2;

    return allNodes.map((node, index): NodePosition => ({
      node,
      x: cx + radius * Math.cos(startAngle + index * angleStep),
      y: cy + radius * Math.sin(startAngle + index * angleStep),
    }));
  });

  /** Edges with computed coordinates. */
  readonly edges: Signal<ReadonlyArray<EdgeLayout>> = computed(() => {
    const positions = this.nodePositions();
    const rels = this.relationships();
    const posMap = new Map<string, NodePosition>();

    for (const pos of positions) {
      posMap.set(pos.node.id, pos);
    }

    return rels
      .map((rel): EdgeLayout | undefined => {
        const source = posMap.get(rel.sourceId);
        const target = posMap.get(rel.targetId);
        if (source === undefined || target === undefined) {
          return undefined;
        }
        return {
          relationship: rel,
          x1: source.x,
          y1: source.y,
          x2: target.x,
          y2: target.y,
          labelX: (source.x + target.x) / 2,
          labelY: (source.y + target.y) / 2,
        };
      })
      .filter((edge): edge is EdgeLayout => edge !== undefined);
  });

  /** SVG viewBox string. */
  readonly viewBox: Signal<string> = computed(() => {
    const size = this.viewBoxSize();
    return `0 0 ${size} ${size}`;
  });

  /**
   * Returns the stroke color for a relationship type.
   * @param type - The relationship type.
   * @returns Hex color string.
   */
  getEdgeColor(type: RelationshipType): string {
    return RELATIONSHIP_COLORS[type];
  }

  /**
   * Returns the emoji icon for a relationship type.
   * @param type - The relationship type.
   * @returns Emoji string.
   */
  getEdgeEmoji(type: RelationshipType): string {
    return RELATIONSHIP_TYPE_EMOJIS[type];
  }

  /** Whether focus mode is currently active. */
  readonly isFocusActive: Signal<boolean> = computed(() => this.focusedNodeId() !== undefined);

  /** The focused node's data (for mini-tooltip display). */
  readonly focusedNode: Signal<RelationshipNode | undefined> = computed(() => {
    const focusId = this.focusedNodeId();
    if (focusId === undefined) {
      return undefined;
    }
    return this.nodes().find((n) => n.id === focusId);
  });

  /** Set of node IDs connected to the focused node (including the focused node itself). */
  private readonly activeNodeIds: Signal<ReadonlySet<string>> = computed(() => {
    const focusId = this.focusedNodeId();
    if (focusId === undefined) {
      return new Set<string>();
    }
    const ids = new Set<string>([focusId]);
    for (const rel of this.relationships()) {
      if (rel.sourceId === focusId) {
        ids.add(rel.targetId);
      }
      if (rel.targetId === focusId) {
        ids.add(rel.sourceId);
      }
    }
    return ids;
  });

  /**
   * Edges with coordinates adjusted for focus mode.
   * When a node is focused, edges connected to it have their endpoint
   * moved to the graph center. Non-connected edges keep original positions
   * (they will be dimmed visually).
   */
  readonly displayEdges: Signal<ReadonlyArray<EdgeLayout>> = computed(() => {
    const baseEdges = this.edges();
    const focusId = this.focusedNodeId();
    if (focusId === undefined) {
      return baseEdges;
    }

    const cx = this.center();
    const cy = this.center();

    return baseEdges.map((edge): EdgeLayout => {
      const isSourceFocused = edge.relationship.sourceId === focusId;
      const isTargetFocused = edge.relationship.targetId === focusId;

      if (!isSourceFocused && !isTargetFocused) {
        return edge;
      }

      const x1 = isSourceFocused ? cx : edge.x1;
      const y1 = isSourceFocused ? cy : edge.y1;
      const x2 = isTargetFocused ? cx : edge.x2;
      const y2 = isTargetFocused ? cy : edge.y2;

      return {
        relationship: edge.relationship,
        x1,
        y1,
        x2,
        y2,
        labelX: (x1 + x2) / 2,
        labelY: (y1 + y2) / 2,
      };
    });
  });

  /** Deduplicated relationship types — filtered to active edges during focus mode. */
  readonly uniqueRelationshipTypes: Signal<ReadonlyArray<RelationshipType>> = computed(() => {
    const types = new Set<RelationshipType>();
    const focusId = this.focusedNodeId();

    for (const edge of this.edges()) {
      if (
        focusId === undefined ||
        edge.relationship.sourceId === focusId ||
        edge.relationship.targetId === focusId
      ) {
        types.add(edge.relationship.type);
      }
    }
    return [...types];
  });

  /**
   * Returns css class modifier for a node type.
   * @param node - The relationship node.
   * @returns CSS class string.
   */
  getNodeClass(node: RelationshipNode): string {
    return node.nodeType === NODE_TYPES.PC ? 'graph-node--pc' : 'graph-node--npc';
  }

  /**
   * Returns the SVG transform string to move a node to the center during focus mode.
   * @param pos - The node's original layout position.
   * @returns CSS transform string or empty string.
   */
  getNodeTransform(pos: NodePosition): string {
    if (this.focusedNodeId() !== pos.node.id) {
      return '';
    }
    const dx = this.center() - pos.x;
    const dy = this.center() - pos.y;
    return `translate(${dx}px, ${dy}px)`;
  }

  /**
   * Whether a node is active (visible) during focus mode.
   * All nodes are active when no focus is set.
   * @param node - The relationship node to check.
   * @returns True if the node should be fully visible.
   */
  isNodeActive(node: RelationshipNode): boolean {
    const focusId = this.focusedNodeId();
    if (focusId === undefined) {
      return true;
    }
    return this.activeNodeIds().has(node.id);
  }

  /**
   * Whether an edge is active (visible) during focus mode.
   * All edges are active when no focus is set.
   * @param edge - The edge layout to check.
   * @returns True if the edge should be fully visible.
   */
  isEdgeActive(edge: EdgeLayout): boolean {
    const focusId = this.focusedNodeId();
    if (focusId === undefined) {
      return true;
    }
    return edge.relationship.sourceId === focusId || edge.relationship.targetId === focusId;
  }

  /**
   * Formats a relationship type for bilingual display.
   * @param type - The relationship type constant.
   * @returns Localized label.
   */
  formatRelationshipType(type: RelationshipType): string {
    const label = RELATIONSHIP_TYPE_LABELS[type];
    return localizeText(label, this.languageService.currentLanguage());
  }

  /**
   * Handles mouse enter on an edge.
   * @param edge - The edge being hovered.
   */
  handleEdgeEnter(edge: EdgeLayout): void {
    this.hoveredEdge.set(edge);
  }

  /** Clears the hovered edge. */
  handleEdgeLeave(): void {
    this.hoveredEdge.set(undefined);
  }

  /**
   * Handles click on an edge — emits the relationship for navigation.
   * @param edge - The clicked edge layout.
   */
  handleEdgeClick(edge: EdgeLayout): void {
    this.edgeClick.emit(edge.relationship);
  }

  /**
   * Toggles focus mode on a node: if the same node is clicked again, unfocus.
   * @param node - The clicked relationship node.
   */
  handleNodeClick(node: RelationshipNode): void {
    if (this.focusedNodeId() === node.id) {
      this.focusedNodeId.set(undefined);
      this.focusTooltipVisible.set(false);
    } else {
      this.focusedNodeId.set(node.id);
      this.focusTooltipVisible.set(true);
    }
    this.hoveredEdge.set(undefined);
  }

  /** Dismisses the focus mini-tooltip without leaving focus mode. */
  dismissFocusTooltip(): void {
    this.focusTooltipVisible.set(false);
  }

  /**
   * Handles the profile link click from the focus mini-tooltip.
   * Emits the focused node for parent navigation.
   * @param node - The focused relationship node.
   */
  handleProfileNavigate(node: RelationshipNode): void {
    this.nodeProfileNavigate.emit(node);
  }

  /** Node radius constant for template use. */
  readonly nodeRadius: number = NODE_RADIUS;
}
