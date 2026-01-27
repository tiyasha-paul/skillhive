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
                class: `prose prose-sm dark:prose-invert max-w-none focus:outline-none h-full`,
            },
        },
    });

    // Sync content updates from parent if needed (e.g. loading a note)
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            if (editor.isEmpty && !content) return;
        }
    }, [content, editor]);

    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);


    if (!editor) {
        return null;
    }

    return (
        <div className={`flex flex-col border rounded-md bg-background/50 ${className}`}>
            <div className="flex items-center gap-1 border-b p-2 bg-muted/40 shrink-0">
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
            <div
                className="flex-1 overflow-y-auto cursor-text p-2"
                onClick={() => editor.chain().focus().run()}
            >
                <EditorContent editor={editor} className="h-full min-h-[150px]" />
            </div>
        </div>
    );
}
