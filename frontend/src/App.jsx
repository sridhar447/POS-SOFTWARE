import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import BillingLayout from './layouts/BillingLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POSBilling from './pages/POSBilling';
import Products from './pages/Products';
import ShowroomStock from './pages/ShowroomStock';
import WarehouseStock from './pages/WarehouseStock';
import StockTransfer from './pages/StockTransfer';
import Purchases from './pages/Purchases';
import BarcodeManagement from './pages/BarcodeManagement';
import Suppliers from './pages/Suppliers';
import Customers from './pages/Customers';
import Sales from './pages/Sales';
import SalesReturn from './pages/SalesReturn';
import DailyAccounts from './pages/DailyAccounts';
import Expenses from './pages/Expenses';
import Attendance from './pages/Attendance';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Settings from './pages/Settings';
import AuditLogs from './pages/AuditLogs';

const RootRedirect = () => {
  const { user, loading, isAdmin } = useAuth();
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400">
        Loading...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return isAdmin ? <Navigate to="/dashboard" replace /> : <Navigate to="/billing" replace />;
};

export const App = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Login */}
            <Route path="/login" element={<Login />} />

            {/* Admin Management Routes */}
            <Route element={<AdminLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/products" element={<Products />} />
              <Route path="/showroom-stock" element={<ShowroomStock />} />
              <Route path="/warehouse-stock" element={<WarehouseStock />} />
              <Route path="/stock-transfer" element={<StockTransfer />} />
              <Route path="/purchases" element={<Purchases />} />
              <Route path="/barcodes" element={<BarcodeManagement />} />
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/returns" element={<SalesReturn />} />
              <Route path="/accounts" element={<DailyAccounts />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/users" element={<Users />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/audit-logs" element={<AuditLogs />} />
            </Route>

            {/* Shared POS & Cashier Console Routes */}
            <Route element={<BillingLayout />}>
              <Route path="/billing" element={<POSBilling />} />
              <Route path="/sales" element={<Sales />} />
              <Route path="/attendance" element={<Attendance />} />
            </Route>

            {/* Default Catch-all */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
