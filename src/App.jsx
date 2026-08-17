import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import AdminRoute from '@/components/AdminRoute';
import CatalogueLayout from '@/components/catalogue/Layout';
import Catalogue from '@/pages/Catalogue.jsx';
import ProductDetail from '@/pages/ProductDetail';
import ManageProducts from '@/pages/ManageProducts';
import ImportProducts from '@/pages/ImportProducts';
import ImageUpload from '@/pages/ImageUpload';
import StockUpload from '@/pages/StockUpload';
import OrderSheet from '@/pages/OrderSheet';
import ManageCustomers from '@/pages/ManageCustomers';
import LoginPage from '@/components/LoginPage';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, isAuthenticated } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) return <LoginPage />;

  // Render the main app
  return (
    <Routes>
      <Route element={<CatalogueLayout />}>
        <Route path="/" element={<Catalogue />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/order" element={<OrderSheet />} />
        <Route element={<AdminRoute />}>
          <Route path="/manage" element={<ManageProducts />} />
          <Route path="/import" element={<ImportProducts />} />
          <Route path="/images" element={<ImageUpload />} />
          <Route path="/stock" element={<StockUpload />} />
          <Route path="/customers" element={<ManageCustomers />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
