import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Underline as UnderlineIcon, Heading, List } from 'lucide-react';
import { useEffect } from 'react';

interface RichTextEditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
    className?: string;
}

export function RichTextEditor({ content, onChange, placeholder = 'Start typing...', className = '' }: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Placeholder.configure({
                placeholder,
            }),
        ],
        content: content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        // Fix for SSR or rapid updates if needed, though usually standard setup is fine.
        editorProps: {
            attributes: {
                class: `prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[150px] p-2 ${className}`,
            },
        },
    });

    // Sync content updates from parent if needed (e.g. loading a note)
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            // Only update if content is significantly different to avoid cursor jumps
            // A simple check might not be enough for real-time collab but fine here
            if (editor.isEmpty && !content) return;
            // We'll trust the parent's content is the source of truth if it changes drastically
            // But usually for local state we rely on onUpdate.
            // A better pattern for controlled input is tricky with Tiptap.
            // For this use case (Load -> Edit), this Effect is mainly for initial load.
            // checking if editor content matches props to avoid loop
        }
    }, [content, editor]);

    // Actually, for "controlled" component behavior, we need to handle external updates carefully.
    // For this specific app, we load `initialNote` once.
    // So we might rely on the initial content passed to `useEditor`.
    // However, `VideoNoteTaker` updates content with Timestamps externally.
    // So we DO need to handle `useEffect` to update editor command.

    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            // Avoid setting content if it's the same to prevent cursor reset
            // This simple check works for full replacements (like timestamp insertion)
            editor.commands.setContent(content);
        }
    }, [content, editor]);


    if (!editor) {
        return null;
    }

    return (
        <div className="space-y-2 border rounded-md p-2 bg-background/50">
            <div className="flex items-center gap-1 border-b pb-2 mb-2">
                <Button
                    variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    title="Bold"
                    type="button"
                >
                    <Bold className="w-4 h-4" />
                </Button>
                <Button
                    variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    title="Italic"
                    type="button"
                >
                    <Italic className="w-4 h-4" />
                </Button>
                <Button
                    variant={editor.isActive('underline') ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    title="Underline"
                    type="button"
                >
                    <UnderlineIcon className="w-4 h-4" />
                </Button>
                <Button
                    variant={editor.isActive('heading', { level: 3 }) ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    title="Heading"
                    type="button"
                >
                    <Heading className="w-4 h-4" />
                </Button>
                <Button
                    variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    title="Bullet List"
                    type="button"
                >
                    <List className="w-4 h-4" />
                </Button>
            </div>
            <EditorContent editor={editor} />
        </div>
    );
}
