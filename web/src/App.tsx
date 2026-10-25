import { Navigate, Outlet, Route, BrowserRouter, Routes } from "react-router-dom";
import Header from "./components/Header";
import AuthPage from "./pages/AuthPage";
import CoursePage from "./pages/CoursePage";
import HomePage from "./pages/HomePage";
import LearnPage from "./pages/LearnPage";
import SettingsPage, {
  AccountSettings,
  CoursesSettings,
  SchoolsSettings,
} from "./pages/SettingsPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import LibraryPage, { LibraryIndexPage } from "./pages/LibraryPage";
import LessonPage from "./pages/LessonPage";
import MaterialPage from "./pages/MaterialPage";
import TrackPage from "./pages/TrackPage";
import UploadPage from "./pages/UploadPage";
import { useSession, SessionProvider } from "./session";

function ProtectedLayout() {
  const { user, booting } = useSession();
  if (booting) {
    return (
      <div className="flex h-full items-center justify-center text-duo-muted">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="min-h-full">
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-6">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/learn" element={<LearnPage />} />
            <Route path="/settings" element={<SettingsPage />}>
              <Route index element={<Navigate to="account" replace />} />
              <Route path="account" element={<AccountSettings />} />
              <Route path="courses" element={<CoursesSettings />} />
              <Route path="schools" element={<SchoolsSettings />} />
            </Route>
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/material/:materialId" element={<MaterialPage />} />
            <Route path="/course/:courseId" element={<CoursePage />} />
            <Route path="/library" element={<LibraryIndexPage />} />
            <Route path="/library/:slug" element={<LibraryPage />} />
            <Route path="/track/:slug" element={<TrackPage />} />
            <Route path="/lesson/:lessonId" element={<LessonPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SessionProvider>
    </BrowserRouter>
  );
}
