"use client"

import { create } from "zustand"
import { fetchCollection, setLocalCache, getLocalCache, uploadFileToDrive } from "../drive-api"
import { scheduleItemUpsert, scheduleItemDelete } from "../sync-manager"

export type FileType = "image" | "video" | "document" | "audio" | "other"

export interface FileItem {
  id: string
  name: string
  type: FileType
  size: number
  category: string
  tags: string[]
  url: string
  downloadUrl?: string
  fileId?: string
  createdAt: string
  updatedAt?: string
}

export const INITIAL_FILES: FileItem[] = [
  {
    id: "f-1",
    name: "abc_corp_intro_v3.mp4",
    type: "video",
    size: 524288000,
    category: "Client Videos",
    tags: ["client", "final"],
    url: "https://drive.google.com",
    createdAt: "2026-09-01T00:00:00.000Z",
  },
  {
    id: "f-2",
    name: "brand_guidelines_2026.pdf",
    type: "document",
    size: 14680064,
    category: "Assets",
    tags: ["branding", "pdf"],
    url: "https://drive.google.com",
    createdAt: "2026-09-01T00:00:00.000Z",
  },
  {
    id: "f-3",
    name: "youtube_thumbnail_ep12.png",
    type: "image",
    size: 3670016,
    category: "Thumbnails",
    tags: ["youtube", "thumb"],
    url: "https://drive.google.com",
    createdAt: "2026-09-01T00:00:00.000Z",
  },
]

function getFileType(fileName: string, mimeType?: string): FileType {
  const ext = fileName.split(".").pop()?.toLowerCase() || ""
  if (["png", "jpg", "jpeg", "webp", "svg", "gif"].includes(ext) || mimeType?.startsWith("image/")) return "image"
  if (["mp4", "mov", "webm", "avi", "mkv"].includes(ext) || mimeType?.startsWith("video/")) return "video"
  if (["mp3", "wav", "aac", "ogg", "flac"].includes(ext) || mimeType?.startsWith("audio/")) return "audio"
  if (["pdf", "doc", "docx", "txt", "md", "csv", "xlsx", "json"].includes(ext)) return "document"
  return "other"
}

interface FileState {
  files: FileItem[]
  isLoading: boolean
  isUploading: boolean
  hasLoaded: boolean

  loadFiles: () => Promise<void>
  uploadFile: (file: File, category?: string) => Promise<{ success: boolean; error?: string }>
  deleteFile: (id: string) => void
  updateFile: (id: string, updates: Partial<FileItem>) => void
}

export const useFileStore = create<FileState>((set, get) => ({
  files: INITIAL_FILES,
  isLoading: false,
  isUploading: false,
  hasLoaded: false,

    loadFiles: async () => {
      set({ isLoading: true })
      try {
        const res = await fetchCollection<FileItem>("files", INITIAL_FILES)
        set({ files: res.items, isLoading: false, hasLoaded: true })
      } catch {
        set({ isLoading: false, hasLoaded: true })
      }
    },

    uploadFile: async (file: File, category = "All Files") => {
      set({ isUploading: true })
      try {
        const folderType = getFileType(file.name, file.type)
        const targetFolder = folderType === "image" ? "images" : folderType === "document" ? "documents" : "attachments"

        const res = await uploadFileToDrive(file, targetFolder)

        if (!res.success) {
          set({ isUploading: false })
          return { success: false, error: res.error || "Upload to Google Drive failed" }
        }

        const now = new Date().toISOString()
        const newFileItem: FileItem = {
          id: res.fileId || `file_${Date.now()}`,
          name: res.fileName || file.name,
          type: folderType,
          size: res.size || file.size,
          category,
          tags: [folderType],
          url: res.url || "",
          downloadUrl: res.downloadUrl || "",
          fileId: res.fileId,
          createdAt: now,
          updatedAt: now,
        }

        const updated = [newFileItem, ...get().files]
        set({ files: updated, isUploading: false })
        setLocalCache("files", updated)
        scheduleItemUpsert("files", newFileItem, 700)

        return { success: true }
      } catch (err: unknown) {
        set({ isUploading: false })
        const msg = err instanceof Error ? err.message : "Upload failed"
        return { success: false, error: msg }
      }
    },

    deleteFile: (id: string) => {
      const updated = get().files.filter(f => f.id !== id)
      set({ files: updated })
      setLocalCache("files", updated)
      scheduleItemDelete("files", id)
    },

    updateFile: (id: string, updates: Partial<FileItem>) => {
      const current = get().files
      const file = current.find(f => f.id === id)
      if (!file) return

      const updatedFile: FileItem = { ...file, ...updates, updatedAt: new Date().toISOString() }
      const updated = current.map(f => f.id === id ? updatedFile : f)
      set({ files: updated })
      setLocalCache("files", updated)
      scheduleItemUpsert("files", updatedFile, 700)
    },
}))
