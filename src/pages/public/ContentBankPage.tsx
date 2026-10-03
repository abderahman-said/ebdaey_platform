import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import TopLoadingBar from "@/components/common/TopLoadingBar";
import { useParams, Link } from "react-router-dom";
import { useMentorSlug } from "@/hooks/useMentorSlug";
import { useBrandedPageTitle } from "@/hooks/useBrandedPageTitle";
import { useMentorUrls } from "@/hooks/useMentorUrls";
import {
  ArrowRight, FolderOpen, Search, FileText, Video,
  Headphones, Link2, FileType2, MousePointerClick, Download, ExternalLink,
  ChevronDown, ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RichTextContent from "@/components/common/RichTextContent";
import { supabase } from "@/integrations/supabase/client";
import CustomVideoPlayer from "@/components/media/CustomVideoPlayer";
import MentorWhatsAppButton from "@/components/common/MentorWhatsAppButton";

import { useAuth } from "@/hooks/useAuth";

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
}

const contentTypeLabels: Record<string, { key: string; icon: any }> = {
  rich: { key: "rich", icon: FileType2 },
  video: { key: "video", icon: Video },
  audio: { key: "audio", icon: Headphones },
  pdf: { key: "pdf", icon: FileText },
  link: { key: "link", icon: Link2 },
  button: { key: "button", icon: MousePointerClick },
};

const ContentBankPage = () => {
  const { courseSlug } = useParams();
  const mentorSlug = useMentorSlug();
  const urls = useMentorUrls(mentorSlug);
  const { user } = useAuth();
  const { t } = useTranslation();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [courseTitle, setCourseTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);
  useBrandedPageTitle(t("miscPublic.studentDashboard.tabTitles.contentBank"));

  useEffect(() => {
    loadData();
  }, [mentorSlug, courseSlug]);

  const loadData = async () => {
    try {
      const { data: tenant } = await supabase
        .from("public_tenants").select("id, whatsapp_number").eq("slug", mentorSlug!).single();
      if (!tenant) return;
      if (tenant.whatsapp_number) setWhatsappNumber(tenant.whatsapp_number);

      const { data: course } = await supabase
        .from("courses").select("id, title").eq("tenant_id", tenant.id).eq("slug", courseSlug!).single();
      if (!course) return;
      setCourseTitle(course.title);

      const { data: foldersData } = await supabase
        .from("content_bank_folders").select("*").eq("course_id", course.id).order("sort_order");
      if (!foldersData) return;

      const folderIds = foldersData.map(f => f.id);
      const { data: allItems } = await supabase
        .from("content_bank_items").select("*, content_bank_blocks(*)").in("folder_id", folderIds).order("sort_order");

      const itemsByFolder = new Map<string, ContentItem[]>();
      (allItems || []).forEach((it: any) => {
        const blocks = (it.content_bank_blocks || []).slice().sort(
          (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
        );
        const b = blocks[0] || {};
        const rawType = b.content_type || "rich";
        const normalizedType = ["text", "note", "image"].includes(rawType) ? "rich" : rawType;
        const flat: ContentItem = {
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
        };
        const arr = itemsByFolder.get(it.folder_id) || [];
        arr.push(flat);
        itemsByFolder.set(it.folder_id, arr);
      });

      const foldersWithItems: Folder[] = foldersData.map(folder => ({
        ...folder,
        items: itemsByFolder.get(folder.id) || [],
      }));

      setFolders(foldersWithItems);
      setExpandedFolders(new Set(foldersData.map(f => f.id)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const allItems = folders.flatMap(f => f.items);
  const filteredFolders = search.trim()
    ? folders.map(f => ({
        ...f,
        items: f.items.filter(i => i.title.toLowerCase().includes(search.toLowerCase())),
      })).filter(f => f.items.length > 0)
    : folders;

  const getIcon = (type: string) => {
    const info = contentTypeLabels[type];
    if (!info) return <FileType2 className="w-4 h-4" />;
    const Icon = info.icon;
    return <Icon className="w-4 h-4" />;
  };

  if (loading) {
    return <TopLoadingBar coverPage />;
  }

  return (
    <div className="min-h-screen bg-[#f8f8f9]">
      {/* Header */}
      <header className="bg-card border-b border-border py-3 sm:py-4 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center gap-3 sm:gap-4">
          <Link
            to={urls.lessonUrl(courseSlug!)}
            className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            <span className="hidden sm:inline">{t("miscPublic.contentBank.back")}</span>
            <span className="sm:hidden">{t("miscPublic.contentBank.backShort")}</span>
          </Link>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary" />
            <h1 className="text-base sm:text-lg font-bold">{t("miscPublic.contentBank.title")}</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("miscPublic.contentBank.searchPlaceholder")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>

        {/* Index - Folder List */}
        {!selectedItem && (
          <div className="bg-card rounded-xl shadow-card p-4 mb-6">
            <h2 className="font-bold text-sm mb-3 flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-primary" />
              {t("miscPublic.contentBank.index")}
            </h2>
            <div className="space-y-1">
              {filteredFolders.map((folder, idx) => (
                <button
                  key={folder.id}
                  onClick={() => {
                    document.getElementById(`folder-${folder.id}`)?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="w-full text-end px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors flex items-center gap-2"
                >
                  <span className="text-muted-foreground text-xs w-5">{idx + 1}.</span>
                  <span>{folder.title}</span>
                  <span className="text-xs text-muted-foreground mr-auto">({folder.items.length})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        {selectedItem ? (
          <div>
            <Button variant="ghost" size="sm" className="mb-4" onClick={() => setSelectedItem(null)}>
              <ArrowRight className="w-4 h-4 ml-1" />
              {t("miscPublic.contentBank.backToIndex")}
            </Button>
            <div className="bg-card rounded-xl shadow-card p-6">
              <div className="flex items-center gap-2 mb-4">
                {getIcon(selectedItem.content_type)}
                <h2 className="text-xl font-bold">{selectedItem.title}</h2>
              </div>

              {/* Rich text & images */}
              {selectedItem.content_type === "rich" && selectedItem.text_content && (
                <RichTextContent html={selectedItem.text_content} className="prose prose-sm max-w-none" />
              )}

              {/* Video */}
              {selectedItem.content_type === "video" && (() => {
                const yt = selectedItem.link_url?.trim();
                const ytMatch = yt?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
                if (ytMatch) {
                  return (
                    <div className="aspect-video w-full">
                      <iframe
                        src={`https://www.youtube.com/embed/${ytMatch[1]}`}
                        title={selectedItem.title}
                        className="w-full h-full rounded-xl"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  );
                }
                if (selectedItem.file_url) {
                  return <CustomVideoPlayer src={selectedItem.file_url} className="w-full rounded-xl" />;
                }
                return null;
              })()}

              {/* Audio */}
              {selectedItem.content_type === "audio" && selectedItem.file_url && (
                <div className="flex flex-col items-center gap-6 py-8">
                  <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center">
                    <Headphones className="w-12 h-12 text-primary" />
                  </div>
                  <audio src={selectedItem.file_url} controls className="w-full max-w-lg" />
                </div>
              )}

              {/* PDF */}
              {selectedItem.content_type === "pdf" && selectedItem.file_url && (
                <div className="space-y-3">
                  <iframe src={selectedItem.file_url} className="w-full h-[70vh] rounded-lg border border-border" title={selectedItem.title} />
                  <a href={selectedItem.file_url} target="_blank" rel="noopener noreferrer" download>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 ml-2" />
                      {t("miscPublic.contentBank.downloadFile")}
                    </Button>
                  </a>
                </div>
              )}

              {/* Description above link/button */}
              {(selectedItem.content_type === "link" || selectedItem.content_type === "button") && selectedItem.description && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-4">
                  {selectedItem.description}
                </p>
              )}

              {/* Link */}
              {selectedItem.content_type === "link" && selectedItem.link_url && (
                <a href={selectedItem.link_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline">
                  <ExternalLink className="w-4 h-4" />
                  {selectedItem.link_url}
                </a>
              )}

              {/* Button */}
              {selectedItem.content_type === "button" && selectedItem.button_url && (
                <a href={selectedItem.button_url} target="_blank" rel="noopener noreferrer">
                  <Button className="gradient-primary text-primary-foreground border-0">
                    {selectedItem.button_label || t("miscPublic.contentBank.click")}
                  </Button>
                </a>
              )}

              {/* Description below for media types only */}
              {["video", "audio", "pdf"].includes(selectedItem.content_type) && selectedItem.description && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-4">
                  {selectedItem.description}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredFolders.map((folder) => (
              <div key={folder.id} id={`folder-${folder.id}`} className="bg-card rounded-xl shadow-card overflow-hidden">
                <button
                  onClick={() => {
                    const s = new Set(expandedFolders);
                    s.has(folder.id) ? s.delete(folder.id) : s.add(folder.id);
                    setExpandedFolders(s);
                  }}
                  className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
                >
                  <FolderOpen className="w-5 h-5 text-primary shrink-0" />
                  <span className="font-bold text-base flex-1 text-end">{folder.title}</span>
                  <span className="text-xs text-muted-foreground">({folder.items.length})</span>
                  {expandedFolders.has(folder.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {expandedFolders.has(folder.id) && (
                  <div className="border-t border-border divide-y divide-border">
                    {folder.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-muted/50 transition-colors text-end"
                      >
                        <div className="text-muted-foreground shrink-0">
                          {getIcon(item.content_type)}
                        </div>
                        <span className="flex-1 text-sm font-medium">{item.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {contentTypeLabels[item.content_type] && t(`miscPublic.contentBank.types.${contentTypeLabels[item.content_type].key}`)}
                        </span>
                      </button>
                    ))}
                    {folder.items.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">{t("miscPublic.contentBank.emptyFolder")}</p>
                    )}
                  </div>
                )}
              </div>
            ))}

            {filteredFolders.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                {search ? t("miscPublic.contentBank.noResults") : t("miscPublic.contentBank.noContent")}
              </div>
            )}
          </div>
        )}
      </div>
      {whatsappNumber && <MentorWhatsAppButton phoneNumber={whatsappNumber} showDualOptions />}
    </div>
  );
};

export default ContentBankPage;
