"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { useEffect, useRef } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const COLORS = [
  "#000000", "#374151", "#991b1b", "#9a3412", "#854d0e",
  "#166534", "#1e40af", "#5b21b6", "#be185d", "#dc2626",
  "#ea580c", "#ca8a04", "#16a34a", "#2563eb", "#7c3aed",
];

function Toolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;

  const btnBase =
    "px-2 py-1 text-[11px] rounded-md transition-colors duration-150";
  const btnActive = "bg-gray-900 text-white";
  const btnInactive = "text-gray-500 hover:bg-gray-100 hover:text-gray-700";

  return (
    <div className="flex items-center gap-0.5 px-3 py-2 border-b border-gray-200 flex-wrap">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`${btnBase} font-bold ${editor.isActive("bold") ? btnActive : btnInactive}`}
      >
        B
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`${btnBase} italic ${editor.isActive("italic") ? btnActive : btnInactive}`}
      >
        I
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`${btnBase} line-through ${editor.isActive("strike") ? btnActive : btnInactive}`}
      >
        S
      </button>

      <div className="w-px h-4 bg-gray-200 mx-1" />

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`${btnBase} ${editor.isActive("bulletList") ? btnActive : btnInactive}`}
      >
        &bull; List
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`${btnBase} ${editor.isActive("orderedList") ? btnActive : btnInactive}`}
      >
        1. List
      </button>

      <div className="w-px h-4 bg-gray-200 mx-1" />

      {/* Color picker */}
      <div className="relative group">
        <button
          type="button"
          className={`${btnBase} ${btnInactive} flex items-center gap-1`}
        >
          <span
            className="w-3 h-3 rounded-sm border border-gray-300"
            style={{ backgroundColor: editor.getAttributes("textStyle").color || "#000000" }}
          />
          <span>Color</span>
        </button>
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 hidden group-hover:grid grid-cols-5 gap-1 z-20 w-max">
          {COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => editor.chain().focus().setColor(color).run()}
              className="w-5 h-5 rounded-sm border border-gray-200 hover:scale-125 transition-transform"
              style={{ backgroundColor: color }}
            />
          ))}
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetColor().run()}
            className="w-5 h-5 rounded-sm border border-gray-200 hover:scale-125 transition-transform text-[8px] flex items-center justify-center text-gray-400 col-span-5"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const isInternalChange = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TextStyle,
      Color,
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          "px-4 py-3 text-sm text-gray-900 outline-none min-h-[100px] prose prose-sm max-w-none [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-4 [&_ol]:pl-4",
      },
    },
    onUpdate: ({ editor }) => {
      isInternalChange.current = true;
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && !isInternalChange.current && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
    isInternalChange.current = false;
  }, [value, editor]);

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden focus-within:border-gray-400 transition-colors">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      {editor?.isEmpty && placeholder && (
        <p className="px-4 -mt-[76px] text-sm text-gray-300 pointer-events-none">{placeholder}</p>
      )}
    </div>
  );
}
