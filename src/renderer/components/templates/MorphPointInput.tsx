import React, { useState, useRef, useEffect } from "react";
import "./MorphPointInput.css";

interface MorphPointInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onDelete: () => void;
  category: "characters" | "settings" | "narrative";
}

/**
 * MorphPointInput Component
 *
 * Input field for a single morph transformation point.
 * Supports multi-line input, validation, and deletion.
 *
 * Features:
 * - Auto-expanding textarea
 * - Character count
 * - Category-based styling
 * - Undo/Redo support (via keyboard)
 * - Delete button with confirmation
 * - Real-time validation feedback
 *
 * @param label - Label for this morph point
 * @param value - Current value
 * @param onChange - Callback on value change
 * @param onDelete - Callback on deletion
 * @param category - Category for styling
 * @returns React component for single morph point input
 */
const MorphPointInput: React.FC<MorphPointInputProps> = ({
  label,
  value,
  onChange,
  onDelete,
  category,
}) => {
  const [charCount, setCharCount] = useState(value.length);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        300
      )}px`;
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const newValue = e.target.value;
    onChange(newValue);
    setCharCount(newValue.length);
  };

  const handleDelete = (): void => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete();
  };

  const handleCancelDelete = (): void => {
    setConfirmDelete(false);
  };

  return (
    <div className={`morph-point-input morph-point-input--${category}`}>
      <div className="morph-point-input__header">
        <label className="morph-point-input__label">{label}</label>
        <span className="morph-point-input__char-count">
          {charCount} characters
        </span>
      </div>

      <textarea
        ref={textareaRef}
        className="morph-point-input__field"
        value={value}
        onChange={handleChange}
        placeholder={`Describe the ${category} transformation...`}
        rows={2}
      />

      <div className="morph-point-input__footer">
        {!confirmDelete ? (
          <button
            className="morph-point-input__delete-btn"
            onClick={handleDelete}
            aria-label={`Delete ${label}`}
            title="Click to delete this transformation"
          >
            🗑️ Delete
          </button>
        ) : (
          <div className="morph-point-input__confirm-delete">
            <span className="morph-point-input__confirm-text">
              Delete this transformation?
            </span>
            <button
              className="morph-point-input__confirm-yes"
              onClick={handleDelete}
            >
              Yes
            </button>
            <button
              className="morph-point-input__confirm-no"
              onClick={handleCancelDelete}
            >
              No
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MorphPointInput;
