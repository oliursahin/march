"use client";

import { useEditor, EditorContent, Editor, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import { useState, useEffect, useCallback, useRef } from "react";

const SaveShortcut = Extension.create({
  name: "saveShortcut",
  addKeyboardShortcuts() {
    return {
      "Mod-s": () => {
        const event = new CustomEvent("object-editor-save");
        document.dispatchEvent(event);
        return true;
      },
    };
  },
});

export function ObjectEditor({
  objectId,
  initialBody,
  initialSubject,
}: {
  objectId: string;
  initialBody: string;
  initialSubject: string;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [subject, setSubject] = useState(initialSubject);
  const subjectRef = useRef(initialSubject);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: "Write something...",
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Underline,
      Highlight,
      Typography,
      SaveShortcut,
    ],
    content: initialBody || "",
    editorProps: {
      attributes: {
        class: "prose-editor outline-none min-h-[40vh]",
      },
    },
    immediatelyRender: false,
  });

  const handleSave = useCallback(async () => {
    if (!editor || saving) return;

    setSaving(true);
    try {
      const bodyText = editor.getText();
      await fetch(`/api/objects/${objectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bodyText, subject: subjectRef.current }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      console.error("Save failed:", e);
    } finally {
      setSaving(false);
    }
  }, [editor, objectId, saving]);

  // Auto-save on changes (debounced)
  useEffect(() => {
    if (!editor) return;

    const handler = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => handleSave(), 2000);
    };

    editor.on("update", handler);
    return () => {
      editor.off("update", handler);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [editor, handleSave]);

  // Cmd+S
  useEffect(() => {
    const handler = () => handleSave();
    document.addEventListener("object-editor-save", handler);
    return () => document.removeEventListener("object-editor-save", handler);
  }, [handleSave]);

  if (!editor) return null;

  return (
    <div>
      <input
        type="text"
        value={subject}
        onChange={(e) => {
          setSubject(e.target.value);
          subjectRef.current = e.target.value;
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => handleSave(), 2000);
        }}
        className="w-full text-lg font-medium text-gray-900 bg-transparent outline-none mb-6 placeholder:text-gray-300"
        placeholder="Title"
      />

      <EditorContent editor={editor} />

      <div className="fixed bottom-8 right-8">
        <span className="text-xs text-gray-400">
          {saving ? "saving..." : saved ? "saved" : ""}
        </span>
      </div>
    </div>
  );
}
