import type { ChangeEvent, DragEvent, RefObject } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';

interface UserProfileAvatarSectionProps {
  fileInputRef: RefObject<HTMLInputElement | null>;
  dropZoneRef: RefObject<HTMLDivElement | null>;
  previewImage: string | null;
  firstName: string;
  lastName: string;
  isProcessingImage: boolean;
  isDragging: boolean;
  onImageUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onRemoveImage: () => void;
}

export default function UserProfileAvatarSection({
  fileInputRef,
  dropZoneRef,
  previewImage,
  firstName,
  lastName,
  isProcessingImage,
  isDragging,
  onImageUpload,
  onDragOver,
  onDragLeave,
  onDrop,
  onRemoveImage,
}: UserProfileAvatarSectionProps) {
  return (
    <div id="profile-section" className="bg-app-surface border-4 border-black shadow-[8px_8px_0px_0px_var(--shadow-color)]">
      <div className="bg-[var(--loop-cyan)] border-b-4 border-black p-4">
        <h2 className="text-2xl font-black uppercase text-app-brutal-ink">Profile</h2>
      </div>

      <div className="p-8 flex flex-col md:flex-row items-center gap-8">
        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          <div className="w-40 h-40 border-4 border-black shadow-[6px_6px_0px_0px_var(--shadow-color)] overflow-hidden bg-app-surface-muted">
            {previewImage ? (
              <img src={previewImage} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#FFD700] text-4xl font-black">
                {firstName?.[0]}
                {lastName?.[0]}
              </div>
            )}
            {isProcessingImage && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
                Loading...
              </div>
            )}
          </div>
          <div className="absolute -bottom-3 -right-3 bg-black text-white p-2 border-2 border-white transform rotate-3">
            EDIT
          </div>
          {previewImage && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onRemoveImage();
              }}
              className="absolute -bottom-3 -left-3 bg-black text-white p-2 border-2 border-white transform -rotate-3 hover:scale-110 transition-transform shadow-[2px_2px_0px_0px_var(--shadow-color)]"
              title="Remove Profile Picture"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex-1 w-full">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onImageUpload}
            className="hidden"
          />

          <div
            ref={dropZoneRef}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-4 border-dashed rounded-none p-6 text-center cursor-pointer transition-all uppercase font-bold
              ${
                isDragging
                  ? 'border-[#4DD0E1] bg-[#E0F7FA] text-black scale-[1.02]'
                  : 'border-app-input-border hover:border-black hover:bg-app-surface-muted text-app-text-muted hover:text-black'
              }`}
          >
            <p className="text-lg">Click to Upload Avatar</p>
            <p className="text-xs mt-2">JPG, PNG or GIF (Max 20MB)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
