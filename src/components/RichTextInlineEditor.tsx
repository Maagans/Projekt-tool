import React, { useEffect, useMemo } from 'react';
import { BubbleMenu, EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

export const sanitizeRichText = (value: string): string => {
  if (!value) return '';
  try {
    if (typeof DOMParser === 'undefined') {
      return value;
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${value}</div>`, 'text/html');
    const allowed = new Set(['B', 'STRONG', 'I', 'EM', 'UL', 'OL', 'LI', 'BR', 'P', 'DIV', 'SPAN']);
    const walker = (node: Element) => {
      Array.from(node.children).forEach((child) => {
        if (!allowed.has(child.tagName)) {
          child.replaceWith(...Array.from(child.childNodes));
          return;
        }
        Array.from(child.attributes).forEach((attr) => child.removeAttribute(attr.name));
        walker(child);
      });
    };
    walker(doc.body);
    return doc.body.innerHTML.replace(/<div>/g, '<p>').replace(/<\/div>/g, '</p>');
  } catch (error) {
    console.warn('Unable to sanitize rich text', error);
    return value;
  }
};

const BubbleButton: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <button
    type="button"
    onMouseDown={(event) => {
      event.preventDefault();
      onClick();
    }}
    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
      active ? 'bg-white text-black' : 'text-white hover:bg-white/20'
    }`}
  >
    {children}
  </button>
);

interface InlineEditorProps {
  initialValue: string;
  onSave: (value: string) => void;
  onCancel: () => void;
}

export const InlineRichEditor: React.FC<InlineEditorProps> = ({ initialValue, onSave, onCancel }) => {
  const sanitized = useMemo(() => sanitizeRichText(initialValue), [initialValue]);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
    ],
    content: sanitized || '<p></p>',
    editorProps: {
      attributes: {
        class:
          'min-h-[80px] prose prose-sm max-w-none text-slate-800 focus:outline-none leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:leading-relaxed',
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(sanitized || '<p></p>', false);
    editor.commands.focus('end');
  }, [editor, sanitized]);

  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  const handleSave = () => {
    if (!editor) return;
    onSave(sanitizeRichText(editor.getHTML()));
  };

  return (
    <div className="rounded-2xl border border-blue-200 bg-white p-3 shadow-lg">
      {editor && (
        <>
          <BubbleMenu
            editor={editor}
            tippyOptions={{ duration: 100, maxWidth: 'none' }}
            shouldShow={({ editor }) => {
              const { from, to } = editor.state.selection;
              return from !== to;
            }}
          >
            <div className="flex items-center gap-1 rounded-2xl bg-black/90 px-2 py-1 text-white shadow-2xl">
              <BubbleButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
                Fed
              </BubbleButton>
              <BubbleButton
                active={editor.isActive('italic')}
                onClick={() => editor.chain().focus().toggleItalic().run()}
              >
                Kursiv
              </BubbleButton>
              <BubbleButton
                active={editor.isActive('bulletList')}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
              >
                • Liste
              </BubbleButton>
              <BubbleButton
                active={editor.isActive('orderedList')}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
              >
                1. Liste
              </BubbleButton>
            </div>
          </BubbleMenu>
          <EditorContent editor={editor} />
        </>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 px-4 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          Fortryd
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="rounded-xl bg-blue-600 px-4 py-1 text-xs font-semibold text-white hover:bg-blue-700"
        >
          Gem
        </button>
      </div>
    </div>
  );
};
