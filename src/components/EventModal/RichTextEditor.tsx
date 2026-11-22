import { useRef, useEffect } from 'react';
import { Bold, Italic, List } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  className?: string;
}

export function RichTextEditor({ value, onChange, className }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || '';
    }
  }, [value]);

  const exec = (cmd: string) => {
    document.execCommand(cmd, false);
    ref.current?.focus();
    onChange(ref.current?.innerHTML ?? '');
  };

  return (
    <div className={cn('rounded-md border border-input overflow-hidden', className)}>
      <div className="flex gap-0.5 border-b border-input bg-muted/40 p-1">
        <button
          type="button"
          className="rounded p-1.5 hover:bg-accent"
          onClick={() => exec('bold')}
          title="Đậm"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="rounded p-1.5 hover:bg-accent"
          onClick={() => exec('italic')}
          title="Nghiêng"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="rounded p-1.5 hover:bg-accent"
          onClick={() => exec('insertUnorderedList')}
          title="Danh sách"
        >
          <List className="h-4 w-4" />
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        className="min-h-[88px] max-h-[160px] overflow-y-auto px-3 py-2 text-sm outline-none prose prose-sm dark:prose-invert"
        onInput={() => onChange(ref.current?.innerHTML ?? '')}
        data-placeholder="Ghi chú, mô tả chi tiết..."
        suppressContentEditableWarning
      />
    </div>
  );
}
