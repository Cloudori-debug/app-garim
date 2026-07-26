import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from '@/app/AppShell'
import { LibraryPage } from '@/features/library/LibraryPage'
import { MarksHubPage } from '@/features/marks/MarksHubPage'
import { MorePage } from '@/features/more/MorePage'
import { ReaderPage } from '@/features/reader/ReaderPage'
import { ReviewSessionPage } from '@/features/review/ReviewSessionPage'
import { TodayPage } from '@/features/today/TodayPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<TodayPage />} />
          <Route path="library" element={<LibraryPage />} />
          <Route path="marks" element={<MarksHubPage />} />
          <Route path="more" element={<MorePage />} />
          <Route path="read/:documentId" element={<ReaderPage />} />
        </Route>
        <Route path="/review" element={<ReviewSessionPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
