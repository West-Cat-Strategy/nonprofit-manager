import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchContactTags, updateContact } from '../store/slices/contactsSlice';
import { useToast } from '../contexts/useToast';
import { BrutalBadge } from './neo-brutalist';

interface ContactTagsProps {
  contactId: string;
  tags?: string[];
}

const ContactTags = ({ contactId, tags = [] }: ContactTagsProps) => {
  const dispatch = useAppDispatch();
  const { availableTags } = useAppSelector((state) => state.contacts);
  const { showSuccess, showError } = useToast();
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    dispatch(fetchContactTags());
  }, [dispatch]);

  const normalizedTags = useMemo(() => new Set(tags.map((tag) => tag.toLowerCase())), [tags]);
  const suggestions = useMemo(
    () => availableTags.filter((tag) => !normalizedTags.has(tag.toLowerCase())).slice(0, 6),
    [availableTags, normalizedTags]
  );

  const persistTags = async (nextTags: string[]) => {
    setIsSaving(true);
    try {
      await dispatch(updateContact({ contactId, data: { tags: nextTags } })).unwrap();
      showSuccess('Tags updated');
    } catch (error) {
      console.error('Failed to update tags:', error);
      showError('Failed to update tags');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTag = async (value?: string) => {
    const nextValue = (value ?? tagInput).trim();
    if (!nextValue) return;

    if (normalizedTags.has(nextValue.toLowerCase())) {
      setTagInput('');
      return;
    }

    await persistTags([...tags, nextValue]);
    setTagInput('');
  };

  const handleRemoveTag = async (tag: string) => {
    await persistTags(tags.filter((item) => item !== tag));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {tags.length === 0 && (
          <p className="text-sm text-black/60 font-bold">No tags yet</p>
        )}
        {tags.map((tag) => (
          <div key={tag} className="flex items-center gap-1">
            <BrutalBadge color="yellow" size="sm">
              {tag}
            </BrutalBadge>
            <button
              type="button"
              onClick={() => handleRemoveTag(tag)}
              disabled={isSaving}
              className="text-xs font-black uppercase text-black/60 hover:text-black"
              aria-label={`Remove tag ${tag}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
              }
            }}
            list={`contact-tag-options-${contactId}`}
            placeholder="Add a tag..."
            className="flex-1 min-w-[180px] px-3 py-2 border-2 border-black text-sm font-bold focus:outline-none"
          />
          <button
            type="button"
            onClick={() => handleAddTag()}
            disabled={isSaving}
            className="px-3 py-2 bg-black text-white text-sm font-black uppercase border-2 border-black shadow-[2px_2px_0px_var(--shadow-color)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_var(--shadow-color)] transition-all"
          >
            Add Tag
          </button>
        </div>

        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleAddTag(tag)}
                className="px-2 py-1 text-xs font-black uppercase border-2 border-black bg-white hover:bg-[var(--loop-yellow)] transition"
              >
                + {tag}
              </button>
            ))}
          </div>
        )}

        <datalist id={`contact-tag-options-${contactId}`}>
          {availableTags.map((tag) => (
            <option key={tag} value={tag} />
          ))}
        </datalist>
      </div>
    </div>
  );
};

export default ContactTags;
