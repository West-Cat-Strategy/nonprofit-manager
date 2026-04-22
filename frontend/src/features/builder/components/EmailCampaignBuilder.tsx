import type {
  EmailBuilderBlock,
  EmailBuilderContent,
  EmailHeadingBlock,
} from '../../../types/mailchimp';

const createBlockId = (type: EmailBuilderBlock['type']) =>
  `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createBlock = (type: EmailBuilderBlock['type']): EmailBuilderBlock => {
  switch (type) {
    case 'heading':
      return {
        id: createBlockId(type),
        type,
        content: 'Add a section heading',
        level: 2,
      };
    case 'paragraph':
      return {
        id: createBlockId(type),
        type,
        content: 'Add your campaign message here.',
      };
    case 'button':
      return {
        id: createBlockId(type),
        type,
        label: 'Open link',
        url: 'https://example.org',
      };
    case 'image':
      return {
        id: createBlockId(type),
        type,
        src: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=80',
        alt: 'Campaign image',
      };
    case 'divider':
      return {
        id: createBlockId(type),
        type,
      };
  }
};

interface EmailCampaignBuilderProps {
  value: EmailBuilderContent;
  onChange: (value: EmailBuilderContent) => void;
}

const blockLabel: Record<EmailBuilderBlock['type'], string> = {
  heading: 'Heading',
  paragraph: 'Paragraph',
  button: 'Button',
  image: 'Image',
  divider: 'Divider',
};

export default function EmailCampaignBuilder({
  value,
  onChange,
}: EmailCampaignBuilderProps) {
  const updateContent = (nextContent: Partial<EmailBuilderContent>) => {
    onChange({
      ...value,
      ...nextContent,
    });
  };

  const updateBlock = (
    blockId: string,
    updater: (block: EmailBuilderBlock) => EmailBuilderBlock
  ) => {
    updateContent({
      blocks: value.blocks.map((block) => (block.id === blockId ? updater(block) : block)),
    });
  };

  const moveBlock = (blockId: string, direction: -1 | 1) => {
    const index = value.blocks.findIndex((block) => block.id === blockId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= value.blocks.length) {
      return;
    }

    const nextBlocks = [...value.blocks];
    const [block] = nextBlocks.splice(index, 1);
    nextBlocks.splice(nextIndex, 0, block);
    updateContent({ blocks: nextBlocks });
  };

  const removeBlock = (blockId: string) => {
    updateContent({
      blocks: value.blocks.filter((block) => block.id !== blockId),
    });
  };

  const addBlock = (type: EmailBuilderBlock['type']) => {
    updateContent({
      blocks: [...value.blocks, createBlock(type)],
    });
  };

  const renderBlockEditor = (block: EmailBuilderBlock) => {
    switch (block.type) {
      case 'heading':
        return (
          <>
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <input
                type="text"
                value={block.content}
                onChange={(event) =>
                  updateBlock(block.id, (current) => ({
                    ...current,
                    content: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-app-input-border px-3 py-2"
                placeholder="Heading text"
              />
              <select
                value={block.level || 2}
                onChange={(event) =>
                  updateBlock(block.id, (current) => ({
                    ...(current as EmailHeadingBlock),
                    level: Number(event.target.value) as 1 | 2 | 3,
                  }))
                }
                className="rounded-lg border border-app-input-border px-3 py-2"
              >
                <option value={1}>H1</option>
                <option value={2}>H2</option>
                <option value={3}>H3</option>
              </select>
            </div>
          </>
        );
      case 'paragraph':
        return (
          <textarea
            value={block.content}
            onChange={(event) =>
              updateBlock(block.id, (current) => ({
                ...current,
                content: event.target.value,
              }))
            }
            rows={5}
            className="w-full rounded-lg border border-app-input-border px-3 py-2"
            placeholder="Paragraph content"
          />
        );
      case 'button':
        return (
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="text"
              value={block.label}
              onChange={(event) =>
                updateBlock(block.id, (current) => ({
                  ...current,
                  label: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-app-input-border px-3 py-2"
              placeholder="Button label"
            />
            <input
              type="url"
              value={block.url}
              onChange={(event) =>
                updateBlock(block.id, (current) => ({
                  ...current,
                  url: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-app-input-border px-3 py-2"
              placeholder="https://example.org"
            />
          </div>
        );
      case 'image':
        return (
          <div className="grid gap-3">
            <input
              type="url"
              value={block.src}
              onChange={(event) =>
                updateBlock(block.id, (current) => ({
                  ...current,
                  src: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-app-input-border px-3 py-2"
              placeholder="https://example.org/image.jpg"
            />
            <div className="grid gap-3 md:grid-cols-2">
              <input
                type="text"
                value={block.alt || ''}
                onChange={(event) =>
                  updateBlock(block.id, (current) => ({
                    ...current,
                    alt: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-app-input-border px-3 py-2"
                placeholder="Alt text"
              />
              <input
                type="url"
                value={block.href || ''}
                onChange={(event) =>
                  updateBlock(block.id, (current) => ({
                    ...current,
                    href: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-app-input-border px-3 py-2"
                placeholder="Optional link"
              />
            </div>
          </div>
        );
      case 'divider':
        return (
          <p className="text-sm text-app-text-muted">
            Divider blocks add a horizontal break between message sections.
          </p>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 rounded-lg border border-app-border bg-app-surface-muted p-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-app-text-label">Accent Color</span>
          <input
            type="color"
            value={value.accentColor || '#0f766e'}
            onChange={(event) => updateContent({ accentColor: event.target.value })}
            className="h-11 w-full rounded-lg border border-app-input-border bg-app-surface p-1"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-app-text-label">Footer Note</span>
          <textarea
            value={value.footerText || ''}
            onChange={(event) => updateContent({ footerText: event.target.value })}
            rows={3}
            className="w-full rounded-lg border border-app-input-border px-3 py-2"
            placeholder="Optional footer note or unsubscribe context"
          />
        </label>
      </div>

      <div className="space-y-3">
        {value.blocks.map((block, index) => (
          <div
            key={block.id}
            className="rounded-lg border border-app-border bg-app-surface p-4 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-app-text-heading">
                  {blockLabel[block.type]}
                </p>
                <p className="text-xs text-app-text-muted">Block {index + 1}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => moveBlock(block.id, -1)}
                  disabled={index === 0}
                  className="rounded-md border border-app-input-border px-2 py-1 text-xs text-app-text-muted disabled:opacity-40"
                >
                  Up
                </button>
                <button
                  type="button"
                  onClick={() => moveBlock(block.id, 1)}
                  disabled={index === value.blocks.length - 1}
                  className="rounded-md border border-app-input-border px-2 py-1 text-xs text-app-text-muted disabled:opacity-40"
                >
                  Down
                </button>
                <button
                  type="button"
                  onClick={() => removeBlock(block.id)}
                  className="rounded-md border border-app-input-border px-2 py-1 text-xs text-app-accent"
                >
                  Remove
                </button>
              </div>
            </div>
            {renderBlockEditor(block)}
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-dashed border-app-input-border bg-app-surface p-4">
        <p className="mb-3 text-sm font-medium text-app-text-heading">Add a block</p>
        <div className="flex flex-wrap gap-2">
          {(['heading', 'paragraph', 'button', 'image', 'divider'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => addBlock(type)}
              className="rounded-full border border-app-input-border px-3 py-1.5 text-sm text-app-text-muted hover:border-app-accent hover:text-app-accent"
            >
              Add {blockLabel[type]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
