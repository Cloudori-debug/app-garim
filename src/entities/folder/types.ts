export interface Folder {
  id: string
  parentId: string | null
  name: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}
