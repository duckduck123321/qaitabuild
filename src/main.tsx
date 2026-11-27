import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, Route, Routes, useLocation } from "react-router-dom";
import "./index.css";
import { AuthProvider, RequireAuth } from "./lib/auth";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Catalog from "./pages/Catalog";
import ListingPage from "./pages/ListingPage";
import ListingForm from "./pages/ListingForm";
import Account from "./pages/Account";
import { Login, Register } from "./pages/Auth";
import { AiHub, Inspector, PreDemolition, ProjectPlanner, Recovery } from "./pages/ai/AiPages";

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function NotFound() {
  return (
    <div className="container-page py-24 text-center">
      <p className="text-6xl font-bold text-sage">404</p>
      <p className="mt-3 text-lg font-semibold">Страница не найдена</p>
      <Link to="/" className="mt-6 inline-block text-primary hover:underline">На главную</Link>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ScrollTop />
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="catalog" element={<Catalog />} />
            <Route path="listing/new" element={<RequireAuth><ListingForm /></RequireAuth>} />
            <Route path="listing/:id" element={<ListingPage />} />
            <Route path="listing/:id/edit" element={<RequireAuth><ListingForm /></RequireAuth>} />
            <Route path="account" element={<RequireAuth><Account /></RequireAuth>} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="ai" element={<AiHub />} />
            <Route path="ai/project-planner" element={<ProjectPlanner />} />
            <Route path="ai/inspector" element={<Inspector />} />
            <Route path="ai/recovery" element={<Recovery />} />
            <Route path="ai/pre-demolition" element={<PreDemolition />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
