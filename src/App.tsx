import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { RequireAdmin } from "@/components/RequireAdmin";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Plan from "./pages/Plan";
import Filters from "./pages/Filters";
import Swipe from "./pages/Swipe";
import Matches from "./pages/Matches";
import RecipeDetail from "./pages/RecipeDetail";
import Shopping from "./pages/Shopping";
import Profile from "./pages/Profile";
import Creator from "./pages/Creator";
import Favorites from "./pages/Favorites";
import SwipeFavorites from "./pages/SwipeFavorites";
import Notifications from "./pages/Notifications";
import Claim from "./pages/Claim";
import CreatorDashboard from "./pages/CreatorDashboard";
import AdminCreators from "./pages/admin/AdminCreators";
import AdminCreatorForm from "./pages/admin/AdminCreatorForm";
import AdminRecipeForm from "./pages/admin/AdminRecipeForm";
import AdminImportCreators from "./pages/admin/AdminImportCreators";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner position="top-center" />
      <BrowserRouter>
        <AuthProvider>
          <AppShell>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/plan" element={<RequireAuth><Plan /></RequireAuth>} />
              <Route path="/filters" element={<RequireAuth><Filters /></RequireAuth>} />
              <Route path="/swipe/:date" element={<RequireAuth><Swipe /></RequireAuth>} />
              <Route path="/matches" element={<RequireAuth><Matches /></RequireAuth>} />
              <Route path="/recipe/:id" element={<RequireAuth><RecipeDetail /></RequireAuth>} />
              <Route path="/shopping" element={<RequireAuth><Shopping /></RequireAuth>} />
              <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
              <Route path="/creator/:id" element={<RequireAuth><Creator /></RequireAuth>} />
              <Route path="/favorites" element={<RequireAuth><Favorites /></RequireAuth>} />
              <Route path="/swipe-favorites" element={<RequireAuth><SwipeFavorites /></RequireAuth>} />
              <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
              <Route path="/claim/:token" element={<Claim />} />
              <Route path="/creator/dashboard" element={<RequireAuth><CreatorDashboard /></RequireAuth>} />
              <Route path="/admin/creators" element={<RequireAuth><RequireAdmin><AdminCreators /></RequireAdmin></RequireAuth>} />
              <Route path="/admin/creators/new" element={<RequireAuth><RequireAdmin><AdminCreatorForm /></RequireAdmin></RequireAuth>} />
              <Route path="/admin/creators/import" element={<RequireAuth><RequireAdmin><AdminImportCreators /></RequireAdmin></RequireAuth>} />
              <Route path="/admin/creators/:id" element={<RequireAuth><RequireAdmin><AdminCreatorForm /></RequireAdmin></RequireAuth>} />
              <Route path="/admin/creators/:id/recipes/new" element={<RequireAuth><RequireAdmin><AdminRecipeForm /></RequireAdmin></RequireAuth>} />
              <Route path="/admin/creators/:id/recipes/:recipeId" element={<RequireAuth><RequireAdmin><AdminRecipeForm /></RequireAdmin></RequireAuth>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppShell>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
