import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import DashboardPage  from "./pages/DashboardPage";
import LibraryPage    from "./pages/LibraryPage";
import BookDetailPage from "./pages/BookDetailPage";
import AskPage        from "./pages/AskPage";
import ScrapePage     from "./pages/ScrapePage";

export default function App() {
  return (
    <div className="flex h-screen overflow-hidden bg-parchment-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/"          element={<DashboardPage  />} />
            <Route path="/books"     element={<LibraryPage    />} />
            <Route path="/books/:id" element={<BookDetailPage />} />
            <Route path="/ask"       element={<AskPage        />} />
            <Route path="/scrape"    element={<ScrapePage     />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
