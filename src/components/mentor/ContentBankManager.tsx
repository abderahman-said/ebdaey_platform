import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import {
  Plus, Trash2, FolderOpen, Upload, ChevronDown, ChevronUp,
  FileText, Video, Headphones, Link2, FileType2,
  MousePointerClick, GripVertical, Edit3, Check, XCircle, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
// Tiptap is ~250KB parsed — lazy so it only downloads when a rich-text block is opened.
const RichTextEditor = lazy(() => import("@/components/mentor/RichTextEditor"));
const RichTextFallback = () => (
  <div className="min-h-[160px] rounded-md border border-input bg-muted/40 flex items-center justify-center">
    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
  </div>
);

interface ContentBankManagerProps {
  courseId?: string;
  liveCourseId?: string;
  tenantId: string;
}

interface Folder {
  id: string;
  title: string;
  sort_order: number;
  items: ContentItem[];
}

interface ContentItem {
  id: string;
  folder_id: string;
  title: string;
  content_type: string;
  text_content: string | null;
  description: string | null;
  file_url: string | null;
  link_url: string | null;
  button_label: string | null;
  button_url: string | null;
  sort_order: number;
  block_id: string | null;
}

const contentTypeOptions = [
  { value: "rich", labelKey: "contentBank.types.rich", icon: FileType2 },
  { value: "video", labelKey: "contentBank.types.video", icon: Video },
  { value: "audio", labelKey: "contentBank.types.audio", icon: Headphones },
  { value: "pdf", labelKey: "contentBank.types.pdf", icon: FileText },
  { value: "link", labelKey: "contentBank.types.link", icon: Link2 },
  { value: "button", labelKey: "contentBank.types.button", icon: MousePointerClick },
] as const;

const getAcceptForType = (type: string) => {
  switch (type) {
    case "video": return "video/*";
    case "audio": return "audio/*";
    case "pdf": return ".pdf";
    default: return "";
  }
};

const ContentBankManager = ({ courseId, liveCourseId, tenantId }: ContentBankManagerProps) => {
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";
  const parentColumn = liveCourseId ? "live_course_id" : "course_id";
  const parentId = liveCourseId || courseId || "";
  const folderPath = liveCourseId ? `live-${liveCourseId}` : courseId || "default";

  const [folders, setFolders] = useState<Folder[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Folder inline-edit
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderTitle, setEditingFolderTitle] = useState("");
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);

  // Item upload state
  const [itemUploading, setItemUploading] = useState<Set<string>>(new Set());
  const [itemProgress, setItemProgress] = useState<Record<string, number>>({});

  // Add item dialog (asks type + title up front)
  const [addItemFolderId, setAddItemFolderId] = useState<string | null>(null);
  const [newItemType, setNewItemType] = useState("rich");
  const [newItemTitle, setNewItemTitle] = useState("");

  // Edit item dialog
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Drag-and-drop
  const [dragFolderId, setDragFolderId] = useState<string | null>(null);
  const [dragItemId, setDragItemId] = useState<string | null>(null);
  const [dragItemFolderId, setDragItemFolderId] = useState<string | null>(null);

  useEffect(() => {
    loadFolders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentId]);

  const loadFolders = async () => {
    const { data: foldersData } = await supabase
      .from("content_bank_folders")
      .select("*")
      .eq(parentColumn, parentId)
      .order("sort_order");
    if (!foldersData) return;

    const folderIds = foldersData.map(f => f.id);
    const { data: allItems } = await supabase
      .from("content_bank_items")
      .select("*, content_bank_blocks(*)")
      .in("folder_id", folderIds.length ? folderIds : ["00000000-0000-0000-0000-000000000000"])
      .order("sort_order");

    const flatten = (it: any): ContentItem => {
      const blocks = (it.content_bank_blocks || []).slice().sort(
        (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
      );
      const b = blocks[0] || {};
      const rawType = b.content_type || "rich";
      const normalizedType = ["text", "note", "image"].includes(rawType) ? "rich" : rawType;
      return {
        id: it.id,
        folder_id: it.folder_id,
        title: it.title,
        sort_order: it.sort_order,
        content_type: normalizedType,
        text_content: b.text_content ?? null,
        description: b.description ?? null,
        file_url: b.file_url ?? null,
        link_url: b.link_url ?? null,
        button_label: b.button_label ?? null,
        button_url: b.button_url ?? null,
        block_id: b.id ?? null,
      };
    };

    const itemsByFolder = new Map<string, ContentItem[]>();
    (allItems || []).forEach((it: any) => {
      const arr = itemsByFolder.get(it.folder_id) || [];
      arr.push(flatten(it));
      itemsByFolder.set(it.folder_id, arr);
    });

    const withItems: Folder[] = foldersData.map(f => ({
      ...f,
      items: itemsByFolder.get(f.id) || [],
    }));
    setFolders(withItems);
    if (withItems.length > 0) setExpandedFolders(new Set(withItems.map(f => f.id)));
  };

  // ---------- Folder CRUD ----------
  const addFolder = async () => {
    const { data } = await supabase
      .from("content_bank_folders")
      .insert({
        course_id: liveCourseId ? null : courseId,
        live_course_id: liveCourseId || null,
        tenant_id: tenantId,
        title: "تصنيف جديد",
        sort_order: folders.length,
      })
      .select()
      .single();
    if (data) {
      setFolders([...folders, { ...(data as any), items: [] }]);
      setExpandedFolders(new Set([...expandedFolders, (data as any).id]));
      toast({ title: t("contentBank.toasts.folderAdded") });
    }
  };

  const updateFolder = async (folderId: string, title: string) => {
    setFolders(folders.map(f => f.id === folderId ? { ...f, title } : f));
    await supabase.from("content_bank_folders").update({ title }).eq("id", folderId);
  };

  const deleteFolder = async (folderId: string) => {
    await supabase.from("content_bank_folders").delete().eq("id", folderId);
    setFolders(folders.filter(f => f.id !== folderId));
    toast({ title: t("contentBank.toasts.folderDeleted") });
  };

  // ---------- Item CRUD ----------
  const addItem = async (folderId: string, type: string, title: string) => {
    const folder = folders.find(f => f.id === folderId);
    const { data: itemData, error: itemErr } = await supabase
      .from("content_bank_items")
      .insert({
        folder_id: folderId,
        course_id: liveCourseId ? null : courseId,
        live_course_id: liveCourseId || null,
        tenant_id: tenantId,
        title: title.trim() || "عنصر بدون عنوان",
        sort_order: folder?.items.length || 0,
      })
      .select()
      .single();
    if (itemErr || !itemData) {
      toast({ title: t("contentBank.toasts.itemAddError"), variant: "destructive" });
      return;
    }
    const { data: blockData } = await supabase
      .from("content_bank_blocks")
      .insert({
        item_id: itemData.id,
        tenant_id: tenantId,
        course_id: liveCourseId ? null : courseId,
        live_course_id: liveCourseId || null,
        content_type: type,
        sort_order: 0,
        ...(type === "button" ? { button_label: "اضغط هنا" } : {}),
      })
      .select()
      .single();

    const newItem: ContentItem = {
      id: itemData.id,
      folder_id: folderId,
      title: itemData.title,
      sort_order: itemData.sort_order,
      content_type: type,
      text_content: null,
      description: null,
      file_url: null,
      link_url: null,
      button_label: type === "button" ? "اضغط هنا" : null,
      button_url: null,
      block_id: blockData?.id ?? null,
    };
    setFolders(folders.map(f =>
      f.id === folderId ? { ...f, items: [...f.items, newItem] } : f
    ));
    toast({ title: t("contentBank.toasts.itemAdded") });
    setEditingItemId(newItem.id);
  };

  const updateItem = async (itemId: string, folderId: string, patch: Partial<ContentItem>) => {
    setFolders(folders.map(f =>
      f.id === folderId ? { ...f, items: f.items.map(i => i.id === itemId ? { ...i, ...patch } : i) } : f
    ));
    const itemPatch: Record<string, any> = {};
    const blockPatch: Record<string, any> = {};
    if (patch.title !== undefined) itemPatch.title = patch.title;
    if (patch.content_type !== undefined) blockPatch.content_type = patch.content_type;
    if (patch.text_content !== undefined) blockPatch.text_content = patch.text_content;
    if (patch.description !== undefined) blockPatch.description = patch.description;
    if (patch.file_url !== undefined) blockPatch.file_url = patch.file_url;
    if (patch.link_url !== undefined) blockPatch.link_url = patch.link_url;
    if (patch.button_label !== undefined) blockPatch.button_label = patch.button_label;
    if (patch.button_url !== undefined) blockPatch.button_url = patch.button_url;

    if (Object.keys(itemPatch).length) {
      await supabase.from("content_bank_items").update(itemPatch as any).eq("id", itemId);
    }
    if (Object.keys(blockPatch).length) {
      const folder = folders.find(f => f.id === folderId);
      const item = folder?.items.find(i => i.id === itemId);
      if (item?.block_id) {
        await supabase.from("content_bank_blocks").update(blockPatch as any).eq("id", item.block_id);
      } else {
        // Create a block if missing
        const { data: blockData } = await supabase
          .from("content_bank_blocks")
          .insert({
            item_id: itemId,
            tenant_id: tenantId,
            course_id: liveCourseId ? null : courseId,
            live_course_id: liveCourseId || null,
            content_type: patch.content_type || item?.content_type || "rich",
            sort_order: 0,
            ...blockPatch,
          })
          .select()
          .single();
        if (blockData) {
          setFolders(prev => prev.map(f =>
            f.id === folderId ? { ...f, items: f.items.map(i => i.id === itemId ? { ...i, block_id: blockData.id } : i) } : f
          ));
        }
      }
    }
  };

  const deleteItem = async (itemId: string, folderId: string) => {
    await supabase.from("content_bank_items").delete().eq("id", itemId);
    setFolders(folders.map(f =>
      f.id === folderId ? { ...f, items: f.items.filter(i => i.id !== itemId) } : f
    ));
  };

  const uploadItemFile = async (itemId: string, folderId: string, file: File, type: string) => {
    setItemUploading(prev => new Set(prev).add(itemId));
    setItemProgress(prev => ({ ...prev, [itemId]: 0 }));
    try {
      const ext = file.name.split(".").pop();
      const path = `${tenantId}/${folderPath}/content-bank/${Date.now()}.${ext}`;
      const { data: signed, error: signErr } = await supabase
        .storage.from("course-assets")
        .createSignedUploadUrl(path);
      if (signErr || !signed) throw signErr || new Error("sign failed");

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", signed.signedUrl);
        xhr.setRequestHeader("x-upsert", "true");
        if (file.type) xhr.setRequestHeader("Content-Type", file.type);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setItemProgress(prev => ({ ...prev, [itemId]: pct }));
          }
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error(`HTTP ${xhr.status}`));
        xhr.onerror = () => reject(new Error("network"));
        xhr.send(file);
      });

      const { data: { publicUrl } } = supabase.storage.from("course-assets").getPublicUrl(path);
      await updateItem(itemId, folderId, { file_url: publicUrl });
      toast({ title: t("contentBank.toasts.fileUploaded") });
    } catch {
      toast({ title: t("contentBank.toasts.fileUploadError"), variant: "destructive" });
    } finally {
      setItemUploading(prev => {
        const s = new Set(prev);
        s.delete(itemId);
        return s;
      });
      setItemProgress(prev => {
        const n = { ...prev };
        delete n[itemId];
        return n;
      });
    }
  };

  // ---------- Drag handlers ----------
  const handleFolderDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragFolderId || dragFolderId === targetId) return;
    const fromIdx = folders.findIndex(f => f.id === dragFolderId);
    const toIdx = folders.findIndex(f => f.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const next = [...folders];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setFolders(next);
  };
  const handleFolderDrop = async () => {
    setDragFolderId(null);
    for (let i = 0; i < folders.length; i++) {
      await supabase.from("content_bank_folders").update({ sort_order: i }).eq("id", folders[i].id);
    }
  };
  const handleItemDragOver = (e: React.DragEvent, folderId: string, targetItemId: string) => {
    e.preventDefault();
    if (!dragItemId || !dragItemFolderId) return;
    if (dragItemFolderId !== folderId) return;
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    const fromIdx = folder.items.findIndex(i => i.id === dragItemId);
    const toIdx = folder.items.findIndex(i => i.id === targetItemId);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
    const next = [...folder.items];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setFolders(prev => prev.map(f => f.id === folderId ? { ...f, items: next } : f));
  };
  const handleItemDrop = async (folderId: string) => {
    setDragItemId(null);
    setDragItemFolderId(null);
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    for (let i = 0; i < folder.items.length; i++) {
      await supabase.from("content_bank_items").update({ sort_order: i }).eq("id", folder.items[i].id);
    }
  };

  const editingItem = folders.flatMap(f => f.items.map(i => ({ item: i, folderId: f.id }))).find(x => x.item.id === editingItemId);

  return (
    <div dir={dir}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">{t("contentBank.title")}</h2>
        <Button onClick={addFolder} variant="outline" size="sm">
          <Plus className="w-4 h-4 ml-2" />
          {t("contentBank.newFolder")}
        </Button>
      </div>

      {folders.length === 0 && (
        <div className="glass-card rounded-2xl p-12 text-center">
          <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
          <p className="text-muted-foreground mb-4">{t("contentBank.empty")}</p>
          <Button onClick={addFolder} variant="outline">
            <Plus className="w-4 h-4 ml-2" />
            {t("contentBank.createFirst")}
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {folders.map((folder) => (
          <div
            id={`cb-folder-${folder.id}`}
            key={folder.id}
            className={`glass-card rounded-2xl overflow-hidden transition-opacity ${dragFolderId === folder.id ? 'opacity-50' : ''}`}
            draggable
            onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDragFolderId(folder.id); }}
            onDragOver={(e) => handleFolderDragOver(e, folder.id)}
            onDragEnd={handleFolderDrop}
            onDrop={(e) => { e.preventDefault(); handleFolderDrop(); }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b border-border">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab shrink-0 hidden sm:block" />
                <FolderOpen className="w-5 h-5 text-primary shrink-0" />

                {editingFolderId === folder.id ? (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
                    <Input
                      value={editingFolderTitle}
                      onChange={e => setEditingFolderTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          updateFolder(folder.id, editingFolderTitle);
                          setEditingFolderId(null);
                        }
                        if (e.key === 'Escape') setEditingFolderId(null);
                      }}
                      className="flex-1 border border-border bg-background font-bold text-base p-2 h-auto focus-visible:ring-2 focus-visible:ring-primary"
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => { updateFolder(folder.id, editingFolderTitle); setEditingFolderId(null); }}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 p-2 border border-green-200 rounded-md"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => setEditingFolderId(null)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 border border-red-200 rounded-md"
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <span className="flex-1 font-bold text-base truncate">{folder.title}</span>
                )}
              </div>

              {editingFolderId !== folder.id && (
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => { setEditingFolderId(folder.id); setEditingFolderTitle(folder.title); }}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-2 border border-blue-200 rounded-md"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => {
                    const s = new Set(expandedFolders);
                    s.has(folder.id) ? s.delete(folder.id) : s.add(folder.id);
                    setExpandedFolders(s);
                  }}>
                    {expandedFolders.has(folder.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setFolderToDelete(folder.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {expandedFolders.has(folder.id) && (
              <div className="p-4 space-y-3">
                {folder.items.map((item, itemIdx) => {
                  const fileable = ["video", "audio", "pdf"].includes(item.content_type);
                  const isUploading = itemUploading.has(item.id);
                  const opt = contentTypeOptions.find(o => o.value === item.content_type);
                  const Icon = opt?.icon ?? FileType2;
                  return (
                    <div
                      key={item.id}
                      className={`border border-border rounded-xl p-5 transition-opacity ${dragItemId === item.id ? 'opacity-50' : ''}`}
                      draggable
                      onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.effectAllowed = 'move'; setDragItemId(item.id); setDragItemFolderId(folder.id); }}
                      onDragOver={(e) => { e.stopPropagation(); handleItemDragOver(e, folder.id, item.id); }}
                      onDragEnd={() => handleItemDrop(folder.id)}
                      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleItemDrop(folder.id); }}
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-border bg-muted shrink-0 flex items-center justify-center">
                          {item.content_type === "image" && item.file_url ? (
                            <img src={item.file_url} alt={item.title} width={96} height={96} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-muted-foreground">
                              <Icon className="w-8 h-8" />
                            </div>
                          )}
                          {isUploading && (
                            <div className="absolute inset-0 bg-background/85 backdrop-blur-sm flex flex-col items-center justify-center gap-1">
                              <Loader2 className="w-5 h-5 animate-spin text-primary" />
                              <span className="text-[11px] font-bold text-primary tabular-nums">
                                {itemProgress[item.id] ?? 0}%
                              </span>
                            </div>
                          )}
                          {fileable && !isUploading && (
                            <label
                              className="absolute top-1 left-1 w-8 h-8 rounded-lg bg-background/90 border border-border flex items-center justify-center cursor-pointer hover:bg-background transition-colors"
                              title={t("contentBank.uploadTitle")}
                            >
                              <input
                                type="file"
                                className="hidden"
                                accept={getAcceptForType(item.content_type)}
                                onChange={e => {
                                  const f = e.target.files?.[0];
                                  if (f) uploadItemFile(item.id, folder.id, f, item.content_type);
                                  e.target.value = '';
                                }}
                              />
                              <Upload className="w-4 h-4" />
                            </label>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 flex items-center gap-2 text-end">
                          <span className="shrink-0 inline-flex items-center justify-center min-w-7 h-7 px-2 rounded-full bg-primary/10 text-primary text-xs font-bold tabular-nums">
                            {itemIdx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{item.title || t("contentBank.untitledItem")}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {opt ? t(opt.labelKey) : null}
                              {item.file_url && ` • ${t("contentBank.uploadedFile")}`}
                              {item.link_url && ` • ${item.link_url}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingItemId(item.id)}>
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => deleteItem(item.id, folder.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                        </div>
                      </div>

                    </div>
                  );
                })}

                {folder.items.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">{t("contentBank.noItems")}</p>
                )}
                <button
                  type="button"
                  onClick={() => { setNewItemTitle(""); setNewItemType("rich"); setAddItemFolderId(folder.id); }}
                  className="mx-auto flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-5 py-2.5 text-sm font-bold text-primary hover:bg-primary/10 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {t("contentBank.addItem")}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Item Dialog (type + title) */}
      <Dialog open={!!addItemFolderId} onOpenChange={(open) => !open && setAddItemFolderId(null)}>
        <DialogContent className="max-w-md" dir={dir}>
          <DialogHeader>
            <DialogTitle>{t("contentBank.add.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">{t("contentBank.add.type")}</Label>
              <Select value={newItemType} onValueChange={setNewItemType} dir={dir}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {contentTypeOptions.map(opt => {
                    const Icon = opt.icon;
                    return (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-2">
                          <Icon className="w-4 h-4 shrink-0" />
                          {t(opt.labelKey)}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{t("contentBank.add.itemTitle")}</Label>
              <Input
                value={newItemTitle}
                onChange={e => setNewItemTitle(e.target.value)}
                placeholder={(() => { const o = contentTypeOptions.find(o => o.value === newItemType); return o ? t(o.labelKey) : t("contentBank.edit.itemTitle"); })()}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddItemFolderId(null)}>{t("contentBank.add.cancel")}</Button>
              <Button
                onClick={() => {
                  if (addItemFolderId) {
                    addItem(addItemFolderId, newItemType, newItemTitle);
                    setAddItemFolderId(null);
                  }
                }}
                className="gradient-primary text-primary-foreground border-0"
              >
                {t("contentBank.add.add")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={!!editingItemId} onOpenChange={(o) => { if (!o) setEditingItemId(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir={dir}>
          <DialogHeader>
            <DialogTitle>{t("contentBank.edit.title")}</DialogTitle>
          </DialogHeader>
          {editingItem && (() => {
            const item = editingItem.item;
            const folderId = editingItem.folderId;
            const isFileType = ["video", "audio", "pdf"].includes(item.content_type);
            const isRichType = item.content_type === "rich";
            const isLinkType = item.content_type === "link";
            const isButtonType = item.content_type === "button";
            const hasDescription = ["video", "audio", "pdf", "link", "button"].includes(item.content_type);
            const isUploading = itemUploading.has(item.id);
            return (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                  <div className="flex items-center gap-2 w-full sm:flex-1">
                    <Input
                      value={item.title}
                      onChange={e => updateItem(item.id, folderId, { title: e.target.value })}
                      className="flex-1"
                      placeholder={t("contentBank.edit.itemTitle")}
                    />
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Select
                      value={item.content_type}
                      onValueChange={v => updateItem(item.id, folderId, { content_type: v })}
                      dir={dir}
                    >
                      <SelectTrigger className="flex-1 sm:flex-none sm:w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {contentTypeOptions.map(opt => {
                          const Icon = opt.icon;
                          return (
                            <SelectItem key={opt.value} value={opt.value}>
                              <span className="flex items-center gap-2">
                                <Icon className="w-4 h-4 shrink-0" />
                                {t(opt.labelKey)}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {isRichType && (
                  <Suspense fallback={<RichTextFallback />}>
                    <RichTextEditor
                      label={t("contentBank.edit.content")}
                      content={item.text_content || ""}
                      onChange={(html) => updateItem(item.id, folderId, { text_content: html })}
                      placeholder={t("contentBank.edit.contentPlaceholder")}
                    />
                  </Suspense>
                )}

                {item.content_type === "video" && (
                  <div className="space-y-2">
                    <Label className="text-sm">{t("contentBank.edit.videoSource")}</Label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateItem(item.id, folderId, { link_url: null })}
                        className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-colors ${!item.link_url ? 'border-primary bg-primary/5 text-primary font-bold' : 'border-input text-muted-foreground hover:border-primary/40'}`}
                      >
                        {t("contentBank.edit.uploadFile")}
                      </button>
                      <button
                        type="button"
                        onClick={() => updateItem(item.id, folderId, { link_url: item.link_url || " ", file_url: null })}
                        className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-colors ${item.link_url ? 'border-primary bg-primary/5 text-primary font-bold' : 'border-input text-muted-foreground hover:border-primary/40'}`}
                      >
                        {t("contentBank.edit.ytLink")}
                      </button>
                    </div>
                  </div>
                )}

                {item.content_type === "video" && item.link_url && (
                  <div className="space-y-2">
                    <Label className="text-sm">{t("contentBank.edit.ytUrl")}</Label>
                    <Input
                      value={item.link_url.trim() || ""}
                      onChange={e => updateItem(item.id, folderId, { link_url: e.target.value || " " })}
                      placeholder="https://www.youtube.com/watch?v=..."
                      dir="ltr"
                    />
                  </div>
                )}

                {isFileType && !(item.content_type === "video" && item.link_url) && (
                  <div className="space-y-2">
                    <Label className="text-sm">{t("contentBank.edit.file")}</Label>
                    <div className="flex items-center gap-3">
                      <label className="inline-flex border border-input rounded-lg px-3 py-2 text-center text-xs text-muted-foreground cursor-pointer hover:border-primary transition-colors">
                        <input
                          type="file"
                          className="hidden"
                          accept={getAcceptForType(item.content_type)}
                          onChange={e => {
                            const f = e.target.files?.[0];
                            if (f) uploadItemFile(item.id, folderId, f, item.content_type);
                            e.target.value = '';
                          }}
                        />
                        {isUploading ? (
                          <span className="flex items-center justify-center gap-2 text-primary">
                            <Loader2 className="w-4 h-4 animate-spin" /> {t("contentBank.edit.uploading")} {itemProgress[item.id] ?? 0}%
                          </span>
                        ) : item.file_url ? (
                          <span className="text-foreground font-medium truncate inline-block max-w-full">
                            {t("contentBank.edit.replaceFile")}
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <Upload className="w-4 h-4" />
                            {t("contentBank.edit.chooseFile")}
                          </span>
                        )}
                      </label>
                    </div>
                    {item.file_url && (
                      <p className="text-xs text-muted-foreground truncate" dir="ltr">
                        {item.file_url.split('/').pop()}
                      </p>
                    )}
                  </div>
                )}

                {(isLinkType || isButtonType) && (
                  <div className="space-y-2">
                    <Label className="text-sm">{t("contentBank.edit.descOptional")}</Label>
                    <Textarea
                      value={item.description || ""}
                      onChange={e => updateItem(item.id, folderId, { description: e.target.value })}
                      rows={3}
                      placeholder={t("contentBank.edit.descPlaceholder")}
                    />
                  </div>
                )}

                {isLinkType && (
                  <div className="space-y-2">
                    <Label className="text-sm">{t("contentBank.edit.url")}</Label>
                    <Input
                      value={item.link_url || ""}
                      onChange={e => updateItem(item.id, folderId, { link_url: e.target.value })}
                      placeholder="https://..."
                      dir="ltr"
                    />
                  </div>
                )}

                {isButtonType && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm">{t("contentBank.edit.buttonLabel")}</Label>
                      <Input
                        value={item.button_label || ""}
                        onChange={e => updateItem(item.id, folderId, { button_label: e.target.value })}
                        placeholder={t("contentBank.edit.buttonLabelPlaceholder")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">{t("contentBank.edit.buttonUrl")}</Label>
                      <Input
                        value={item.button_url || ""}
                        onChange={e => updateItem(item.id, folderId, { button_url: e.target.value })}
                        placeholder="https://..."
                        dir="ltr"
                      />
                    </div>
                  </>
                )}

                {["video", "audio", "pdf"].includes(item.content_type) && (
                  <div className="space-y-2">
                    <Label className="text-sm">{t("contentBank.edit.descOptional")}</Label>
                    <Textarea
                      value={item.description || ""}
                      onChange={e => updateItem(item.id, folderId, { description: e.target.value })}
                      rows={3}
                      placeholder={t("contentBank.edit.descPlaceholder")}
                    />
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button onClick={() => setEditingItemId(null)} className="gradient-primary text-primary-foreground border-0">
                    <Check className="w-4 h-4 ml-1" />
                    {t("contentBank.edit.done")}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Delete Folder Confirmation */}
      <Dialog open={!!folderToDelete} onOpenChange={(open) => !open && setFolderToDelete(null)}>
        <DialogContent className="max-w-md" dir={dir}>
          <DialogHeader>
            <DialogTitle>{t("contentBank.delete.title")}</DialogTitle>
            <DialogDescription>
              {t("contentBank.delete.desc")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-start">
            <Button variant="outline" onClick={() => setFolderToDelete(null)}>{t("contentBank.delete.cancel")}</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (folderToDelete) {
                  deleteFolder(folderToDelete);
                  setFolderToDelete(null);
                }
              }}
            >
              <Trash2 className="w-4 h-4 ml-1" />
              {t("contentBank.delete.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContentBankManager;
