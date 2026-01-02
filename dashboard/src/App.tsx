import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainLayout } from './components/layout';
import { LoginPage, RegisterPage } from './pages/auth';
import { DashboardPage } from './pages/dashboard';
import { ModelsPage, ModelFormPage, FanvueConnectPage } from './pages/models';
import { ChatsPage, ChatDetailPage, OFChatDetailPage } from './pages/chats';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function AppContent() {
  // checkAuth is now called automatically after zustand rehydration
  // See authStore.ts onRehydrateStorage

  return (
    <Routes>
      {/* Auth routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected routes */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/models" element={<ModelsPage />} />
        <Route path="/models/new" element={<ModelFormPage />} />
        <Route path="/models/:id/edit" element={<ModelFormPage />} />
        <Route path="/models/:id/fanvue" element={<FanvueConnectPage />} />

        {/* Chats */}
        <Route path="/chats" element={<ChatsPage />} />
        <Route path="/chats/:modelId/:fanUserUuid" element={<ChatDetailPage />} />
        <Route path="/chats/of/:chatId" element={<OFChatDetailPage />} />

        {/* Placeholder routes */}
        <Route path="/analytics" element={<PlaceholderPage title="Analytics" />} />
        <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Temporary placeholder for unimplemented pages
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
        <p className="text-dark-400">Coming soon...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/of-dashboard">
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
