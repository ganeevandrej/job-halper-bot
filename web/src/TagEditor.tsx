import { KeyboardEvent, useState } from "react";

interface TagEditorProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

function TagEditor({ value, onChange, placeholder }: TagEditorProps) {
  const [draft, setDraft] = useState("");

  const addTag = (rawValue: string) => {
    const nextTags = rawValue
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (nextTags.length === 0) {
      return;
    }

    const existing = new Set(value.map((item) => item.toLowerCase()));
    const merged = [...value];

    for (const tag of nextTags) {
      if (!existing.has(tag.toLowerCase())) {
        existing.add(tag.toLowerCase());
        merged.push(tag);
      }
    }

    onChange(merged);
    setDraft("");
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((item) => item !== tag));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(draft);
      return;
    }

    if (event.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="tagEditor">
      <div className="tagList">
        {value.map((tag) => (
          <span className="tagChip" key={tag}>
            {tag}
            <button
              type="button"
              aria-label={`Удалить ${tag}`}
              onClick={() => removeTag(tag)}
            >
              x
            </button>
          </span>
        ))}
        <input
          value={draft}
          onBlur={() => addTag(draft)}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={value.length > 0 ? "" : placeholder}
        />
      </div>
    </div>
  );
}

export default TagEditor;
