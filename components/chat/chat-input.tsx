import {
  IconArrowUp,
  IconPaperclip,
  IconSquare,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  stop?: () => void;
  canUpload?: boolean;
  files?: File[];
  onFilesChange?: (files: File[]) => void;
}

export function ChatInput({
  input,
  setInput,
  isLoading,
  onSubmit,
  stop,
  canUpload = false,
  files = [],
  onFilesChange,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "inherit";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 200)}px`;
    }
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        onSubmit(e);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && onFilesChange) {
      const newFiles = Array.from(e.target.files);
      onFilesChange([...files, ...newFiles]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    if (onFilesChange) {
      const newFiles = files.filter((_, i) => i !== index);
      onFilesChange(newFiles);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl lg:max-w-4xl xl:max-w-5xl px-3 md:px-4 pb-4 md:pb-6">
      <form
        onSubmit={onSubmit}
        className="relative flex w-full items-end gap-2 rounded-xl border bg-background p-1.5 md:p-2 focus-within:ring-1 focus-within:ring-ring shadow-lg md:shadow-none"
      >
        {canUpload && (
          <>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              accept="image/*,.pdf"
              onChange={handleFileSelect}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mb-0.5 rounded-lg shrink-0 h-9 w-9 md:h-10 md:w-10 text-muted-foreground hover:text-foreground"
              onClick={() => fileInputRef.current?.click()}
            >
              <IconPaperclip size={18} />
              <span className="sr-only">Attach file</span>
            </Button>
          </>
        )}
        <div className="flex-1 min-w-0 flex flex-col">
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 px-2 pb-2">
              {files.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-foreground"
                >
                  <span className="truncate max-w-[100px]">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="rounded-full p-0.5 hover:bg-background/50"
                  >
                    <IconX size={12} />
                    <span className="sr-only">Remove {file.name}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Chat..."
            className="min-h-[44px] w-full resize-none border-0 bg-transparent py-3 text-base md:text-sm focus-visible:ring-0 shadow-none max-h-[200px]"
            rows={1}
          />
        </div>
        <Button
          type={isLoading ? "button" : "submit"}
          size="icon"
          disabled={!input.trim() && !isLoading}
          onClick={isLoading ? stop : undefined}
          className="mb-0.5 rounded-lg shrink-0 h-9 w-9 md:h-10 md:w-10"
        >
          {isLoading ? (
            <IconSquare size={16} fill="currentColor" />
          ) : (
            <IconArrowUp size={18} />
          )}
          <span className="sr-only">Send message</span>
        </Button>
      </form>
      <div className="mt-2 text-center text-[10px] md:text-xs text-muted-foreground hidden sm:block">
        AI can make mistakes. Check important info.
      </div>
    </div>
  );
}
