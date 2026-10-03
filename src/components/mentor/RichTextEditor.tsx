import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import AudioExtension from "./AudioExtension";
import { TextStyle } from "@tiptap/extension-text-style";
import { Extension } from "@tiptap/react";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { useEffect, useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  AlignRight,
  AlignCenter,
  AlignLeft,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Link as LinkIcon,
  Unlink,
  Youtube as YoutubeIcon,
  ImagePlus,
  Music,
  RemoveFormatting,
  Type,
  Palette,
  Highlighter,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FontSize = Extension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.fontSize || null,
            renderHTML: (attributes: Record<string, any>) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
});

const SingleLineEnter = Extension.create({
  name: "singleLineEnter",
  priority: 1000,
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        // Keep TipTap's structural Enter behavior inside lists and code blocks.
        // In normal text, insert exactly one visible line break.
        if (this.editor.isActive("listItem") || this.editor.isActive("codeBlock")) {
          return false;
        }
        return this.editor.commands.setHardBreak();
      },
    };
  },
});

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  /** Tailwind classes controlling the scrollable editing area height */
  editorClassName?: string;
}


const MenuButton = ({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  title: string;
}) => (
  <button
    type="button"
    // Keep the editor selection alive when clicking toolbar buttons
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    title={title}
    className={cn(
      "p-1.5 rounded transition-colors",
      active
        ? "bg-primary/20 text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    )}
  >
    {children}
  </button>
);


const Separator = () => <div className="w-px h-5 bg-border mx-1" />;

const TEXT_SIZES = [
  { labelKey: "richTextEditor.sizes.small", value: "12px" },
  { labelKey: "richTextEditor.sizes.normal", value: "16px" },
  { labelKey: "richTextEditor.sizes.medium", value: "20px" },
  { labelKey: "richTextEditor.sizes.large", value: "24px" },
  { labelKey: "richTextEditor.sizes.xlarge", value: "32px" },
];


const COLORS = [
  "#000000", "#374151", "#6B7280", "#EF4444", "#F59E0B",
  "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#FFFFFF",
];

const BG_COLORS = [
  "transparent", "#FEF3C7", "#DCFCE7", "#DBEAFE", "#F3E8FF",
  "#FCE7F3", "#FEE2E2", "#E0E7FF", "#CCFBF1", "#FEF9C3",
];

const RichTextEditor = ({
  content,
  onChange,
  placeholder,
  label,
  className,
  editorClassName,
}: RichTextEditorProps) => {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  const textColorRef = useRef<HTMLInputElement>(null);
  const bgColorRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const lastEmittedHtmlRef = useRef(content || "");
  const [uploading, setUploading] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [sizeMenuOpen, setSizeMenuOpen] = useState(false);

  useEffect(() => {
    if (!sizeMenuOpen) return;
    const close = () => setSizeMenuOpen(false);
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [sizeMenuOpen]);


  const editor: any = useEditor({
    extensions: [
      SingleLineEnter,
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          HTMLAttributes: { class: "text-primary underline cursor-pointer" },
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
        defaultAlignment: "right",
      }),
      Image.configure({
        HTMLAttributes: { class: "max-w-full rounded-lg my-2" },
      }),
      Youtube.configure({
        HTMLAttributes: { class: "w-full aspect-video rounded-lg my-2" },
        width: 640,
        height: 360,
      }),
      AudioExtension,
      TextStyle,
      Color,
      FontSize,
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      lastEmittedHtmlRef.current = html;
      onChange(html);
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[120px] px-4 py-3 focus:outline-none text-foreground [&_p]:my-0 [&>*]:[unicode-bidi:plaintext]",
        // "auto" lets each line follow the direction of what is typed, so an
        // English line stays left-to-right inside an Arabic (RTL) editor.
        dir: "auto",
      },
    },

  });

  useEffect(() => {
    if (!editor) return;
    const incoming = content || "";
    // Parent components echo onUpdate back through the content prop. Never
    // feed that echo into setContent, because it can undo Enter's splitBlock
    // transaction before the new paragraph and caret settle.
    if (incoming === lastEmittedHtmlRef.current) return;
    if (editor.isFocused) return;
    if (incoming === editor.getHTML()) return;
    lastEmittedHtmlRef.current = incoming;
    editor.commands.setContent(incoming, { emitUpdate: false });
  }, [content, editor]);


  const addLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt(t("richTextEditor.prompts.linkTitle"), previousUrl || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor, t]);

  const addYoutube = useCallback(() => {
    if (!editor) return;
    const url = window.prompt(t("richTextEditor.prompts.youtubeTitle"));
    if (!url) return;
    editor.commands.setYoutubeVideo({ src: url });
  }, [editor, t]);

  const addImage = useCallback(() => {
    if (!editor) return;
    imageInputRef.current?.click();
  }, [editor]);

  const addAudio = useCallback(() => {
    if (!editor) return;
    audioInputRef.current?.click();
  }, [editor]);

  const handleAudioUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editor) return;
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("audio/")) {
      toast.error(t("richTextEditor.toasts.audioType"));
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error(t("richTextEditor.toasts.audioSize"));
      return;
    }

    setUploadingAudio(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `editor/audio/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("course-assets").upload(path, file, {
        contentType: file.type,
      });
      if (error) throw error;

      const { data: urlData } = supabase.storage.from("course-assets").getPublicUrl(path);
      (editor.commands as any).setAudio({ src: urlData.publicUrl });
      toast.success(t("richTextEditor.toasts.audioUploaded"));
    } catch (err: any) {
      toast.error(t("richTextEditor.toasts.audioFailed") + (err.message || t("richTextEditor.toasts.unknownError")));
    } finally {
      setUploadingAudio(false);
      if (audioInputRef.current) audioInputRef.current.value = "";
    }
  }, [editor, t]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editor) return;
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(t("richTextEditor.toasts.imageType"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("richTextEditor.toasts.imageSize"));
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `editor/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("course-assets").upload(path, file);
      if (error) throw error;

      const { data: urlData } = supabase.storage.from("course-assets").getPublicUrl(path);
      editor.chain().focus().setImage({ src: urlData.publicUrl }).run();
      toast.success(t("richTextEditor.toasts.imageUploaded"));
    } catch (err: any) {
      toast.error(t("richTextEditor.toasts.imageFailed") + (err.message || t("richTextEditor.toasts.unknownError")));
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }, [editor, t]);

  const setFontSize = useCallback((size: string) => {
    if (!editor) return;
    const { empty, $from } = editor.state.selection;
    const chain = editor.chain().focus();

    if (empty) {
      // No selection: apply the size to the whole current block so the click
      // has a visible effect instead of silently setting a stored mark.
      const start = $from.start();
      const end = $from.end();
      if (end > start) {
        chain.setTextSelection({ from: start, to: end });
      }
    }

    chain.setMark("textStyle", { fontSize: size }).run();
  }, [editor]);


  if (!editor) return null;

  return (
    <div className={cn("space-y-2 flex flex-col min-h-0", className)}>
      {label && (
        <label className="text-sm font-medium text-foreground">{label}</label>
      )}
      <div className="border border-input rounded-lg overflow-hidden bg-background flex flex-col flex-1 min-h-0">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-input bg-background dark:bg-input">
          {/* Bold / Italic / Underline */}
          <MenuButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            title={t("richTextEditor.titles.bold")}
          >
            <Bold className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            title={t("richTextEditor.titles.italic")}
          >
            <Italic className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive("underline")}
            title={t("richTextEditor.titles.underline")}
          >
            <UnderlineIcon className="w-4 h-4" />
          </MenuButton>

          <Separator />

          {/* Headings */}
          <MenuButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive("heading", { level: 1 })}
            title={t("richTextEditor.titles.h1")}
          >
            <Heading1 className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive("heading", { level: 2 })}
            title={t("richTextEditor.titles.h2")}
          >
            <Heading2 className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive("heading", { level: 3 })}
            title={t("richTextEditor.titles.h3")}
          >
            <Heading3 className="w-4 h-4" />
          </MenuButton>

          {/* Text Size */}
          <div className="relative" onPointerDown={(e) => e.stopPropagation()}>
            <MenuButton
              onClick={() => setSizeMenuOpen((v) => !v)}
              active={sizeMenuOpen}
              title={t("richTextEditor.titles.fontSize")}
            >
              <Type className="w-4 h-4" />
            </MenuButton>
            {sizeMenuOpen && (
              <div className="absolute top-full start-0 mt-1 bg-popover border border-border rounded-lg shadow-lg p-1 z-50 min-w-[110px]">
                {TEXT_SIZES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setFontSize(s.value);
                      setSizeMenuOpen(false);
                    }}
                    className="block w-full text-start px-3 py-1.5 text-sm hover:bg-muted rounded transition-colors"
                    style={{ fontSize: s.value }}
                  >
                    {t(s.labelKey)}
                  </button>
                ))}
              </div>
            )}
          </div>


          <Separator />

          {/* Text Color */}
          <div className="relative group">
            <MenuButton onClick={() => {}} title={t("richTextEditor.titles.textColor")}>
              <Palette className="w-4 h-4" />
            </MenuButton>
            <div className="absolute top-full right-0 pt-1 hidden group-hover:block z-50">
              <div className="bg-popover border border-border rounded-lg shadow-lg p-2">
              <div className="grid grid-cols-5 gap-1 mb-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => editor.chain().focus().setColor(color).run()}
                    className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1">
                <input
                  ref={textColorRef}
                  type="color"
                  className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                  onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
                  title={t("richTextEditor.titles.customColor")}
                />
                <span className="text-xs text-muted-foreground">{t("richTextEditor.titles.custom")}</span>
              </div>
              </div>
            </div>
          </div>

          {/* Background Color */}
          <div className="relative group">
            <MenuButton onClick={() => {}} title={t("richTextEditor.titles.bgColor")}>
              <Highlighter className="w-4 h-4" />
            </MenuButton>
            <div className="absolute top-full right-0 pt-1 hidden group-hover:block z-50">
              <div className="bg-popover border border-border rounded-lg shadow-lg p-2">
              <div className="grid grid-cols-5 gap-1 mb-2">
                {BG_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (color === "transparent") {
                        editor.chain().focus().unsetHighlight().run();
                      } else {
                        editor.chain().focus().toggleHighlight({ color }).run();
                      }
                    }}
                    className={cn(
                      "w-6 h-6 rounded border border-border hover:scale-110 transition-transform",
                      color === "transparent" && "bg-background relative after:content-['✕'] after:text-[10px] after:text-muted-foreground after:absolute after:inset-0 after:flex after:items-center after:justify-center"
                    )}
                    style={color !== "transparent" ? { backgroundColor: color } : undefined}
                    title={color === "transparent" ? t("richTextEditor.titles.noBg") : color}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1">
                <input
                  ref={bgColorRef}
                  type="color"
                  className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                  onChange={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()}
                  title={t("richTextEditor.titles.customColor")}
                />
                <span className="text-xs text-muted-foreground">{t("richTextEditor.titles.custom")}</span>
              </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Lists */}
          <MenuButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
            title={t("richTextEditor.titles.bulletList")}
          >
            <List className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
            title={t("richTextEditor.titles.orderedList")}
          >
            <ListOrdered className="w-4 h-4" />
          </MenuButton>

          <Separator />

          {/* Alignment */}
          <MenuButton
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            active={editor.isActive({ textAlign: "right" })}
            title={t("richTextEditor.titles.alignRight")}
          >
            <AlignRight className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            active={editor.isActive({ textAlign: "center" })}
            title={t("richTextEditor.titles.alignCenter")}
          >
            <AlignCenter className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            active={editor.isActive({ textAlign: "left" })}
            title={t("richTextEditor.titles.alignLeft")}
          >
            <AlignLeft className="w-4 h-4" />
          </MenuButton>

          <Separator />

          {/* Link */}
          <MenuButton
            onClick={addLink}
            active={editor.isActive("link")}
            title={t("richTextEditor.titles.addLink")}
          >
            <LinkIcon className="w-4 h-4" />
          </MenuButton>
          {editor.isActive("link") && (
            <MenuButton
              onClick={() => editor.chain().focus().unsetLink().run()}
              title={t("richTextEditor.titles.removeLink")}
            >
              <Unlink className="w-4 h-4" />
            </MenuButton>
          )}

          {/* YouTube */}
          <MenuButton onClick={addYoutube} title={t("richTextEditor.titles.addYoutube")}>
            <YoutubeIcon className="w-4 h-4" />
          </MenuButton>

          {/* Image */}
          <MenuButton onClick={addImage} title={uploading ? t("richTextEditor.titles.uploading") : t("richTextEditor.titles.addImage")}>
            <ImagePlus className={cn("w-4 h-4", uploading && "animate-pulse")} />
          </MenuButton>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />

          {/* Audio */}
          <MenuButton onClick={addAudio} title={uploadingAudio ? t("richTextEditor.titles.uploading") : t("richTextEditor.titles.addAudio")}>
            <Music className={cn("w-4 h-4", uploadingAudio && "animate-pulse")} />
          </MenuButton>
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleAudioUpload}
          />

          <Separator />

          {/* Clear Formatting */}
          <MenuButton
            onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
            title={t("richTextEditor.titles.clearFormat")}
          >
            <RemoveFormatting className="w-4 h-4" />
          </MenuButton>

          {/* Undo / Redo */}
          <MenuButton
            onClick={() => editor.chain().focus().undo().run()}
            title={t("richTextEditor.titles.undo")}
          >
            <Undo className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().redo().run()}
            title={t("richTextEditor.titles.redo")}
          >
            <Redo className="w-4 h-4" />
          </MenuButton>
        </div>

        {/* Editor content */}
        <div className={cn("overflow-y-auto bg-background dark:bg-input flex-1 min-h-0", editorClassName ?? "max-h-[250px]")}>
          <EditorContent editor={editor} />
        </div>


      </div>
    </div>
  );
};

export default RichTextEditor;
