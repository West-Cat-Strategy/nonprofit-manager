import { useMemo, useState } from 'react';
import type { ContactFormValues } from '../types';

interface TagsSectionProps {
  formData: ContactFormValues;
  availableTags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
}

export default function TagsSection({
  formData,
  availableTags,
  onAddTag,
  onRemoveTag,
}: TagsSectionProps) {
  const [tagInput, setTagInput] = useState('');
  const selectedTags = useMemo(() => formData.tags ?? [], [formData.tags]);

  const suggestions = useMemo(() => {
    const selected = new Set(selectedTags.map((tag) => tag.toLowerCase()));
    return availableTags.filter((tag) => !selected.has(tag.toLowerCase())).slice(0, 6);
  }, [availableTags, selectedTags]);

  const handleAdd = (value?: string) => {
    const nextValue = (value ?? tagInput).trim();
    if (!nextValue) return;
    onAddTag(nextValue);
    setTagInput('');
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Tags</h2>
      <div className="flex flex-wrap gap-2">
        {selectedTags.length === 0 && (
          <p className="text-sm text-gray-500">No tags yet</p>
        )}
        {selectedTags.map((tag) => (
          <div key={tag} className="flex items-center gap-2 px-2 py-1 border-2 border-black">
            <span className="text-xs font-bold uppercase text-black">{tag}</span>
            <button
              type="button"
              onClick={() => onRemoveTag(tag)}
              className="text-xs font-black uppercase text-black/60 hover:text-black"
              aria-label={`Remove tag ${tag}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          list="contact-form-tags"
          placeholder="Add a tag..."
          className="flex-1 min-w-[200px] border-2 border-black px-3 py-2 text-sm font-bold"
        />
        <button
          type="button"
          onClick={() => handleAdd()}
          className="px-3 py-2 bg-black text-white text-sm font-black uppercase border-2 border-black"
        >
          Add Tag
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleAdd(tag)}
              className="px-2 py-1 text-xs font-black uppercase border-2 border-black bg-white hover:bg-[var(--loop-yellow)] transition"
            >
              + {tag}
            </button>
          ))}
        </div>
      )}

      <datalist id="contact-form-tags">
        {availableTags.map((tag) => (
          <option key={tag} value={tag} />
        ))}
      </datalist>
    </div>
  );
}
