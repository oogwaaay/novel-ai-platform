import type { BlockSchema } from '../types/block';
import { renderBlock } from '../utils/blockRenderer';

interface WorkspaceViewProps {
  blocks: BlockSchema[];
  className?: string;
}

export function WorkspaceView({ blocks, className = '' }: WorkspaceViewProps) {
  return (
    <div className={`space-y-12 ${className}`}>
      {blocks.map((block) => (
        <section key={block.id} id={block.anchorId} className={block.className}>
          {renderBlock(block)}
        </section>
      ))}
    </div>
  );
}

