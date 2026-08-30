import { Redo2, Undo2 } from 'lucide-react'

import { Button } from '@/shared/ui/button'
import { ToolCluster } from '@/shared/ui/tool-cluster'

export function UndoRedoButtons({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: {
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}) {
  return (
    <ToolCluster>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        disabled={!canUndo}
        title="실행 취소 (Ctrl+Z)"
        aria-label="실행 취소"
        onClick={onUndo}
      >
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        disabled={!canRedo}
        title="다시 실행 (Ctrl+Shift+Z)"
        aria-label="다시 실행"
        onClick={onRedo}
      >
        <Redo2 className="h-4 w-4" />
      </Button>
    </ToolCluster>
  )
}
