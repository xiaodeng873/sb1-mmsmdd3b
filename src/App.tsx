import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Scheduling from './pages/Scheduling';
import PatientRecords from './pages/PatientRecords';
import MedicationRegistration from './pages/MedicationRegistration';
import TemplateManagement from './pages/TemplateManagement';
import HealthAssessment from './pages/HealthAssessment';
import Reports from './pages/Reports';
import FollowUpManagement from './pages/FollowUpManagement';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthModal } from './components/AuthModal';
import { PatientProvider } from './context/PatientContext';
import './App.css';

function AppContent() {
  const { user, loading, authReady, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  if (loading || !authReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{loading ? '載入中...' : '準備中...'}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Station C</h1>
            <p className="text-gray-600">請登入以繼續使用系統</p>
          </div>
          <button
            onClick={() => setShowAuthModal(true)}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            登入 / 註冊
          </button>
        </div>
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
        />
      </div>
    );
  }

  return (
    <Layout user={user} onSignOut={signOut}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/scheduling" element={<Scheduling />} />
        <Route path="/follow-up" element={<FollowUpManagement />} />
        <Route path="/patients" element={<PatientRecords />} />
        <Route path="/medication" element={<MedicationRegistration />} />
        <Route path="/templates" element={<TemplateManagement />} />
        <Route path="/health" element={<HealthAssessment />} />
        <Route path="/reports" element={<Reports />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <PatientProvider>
        <Router>
          <AppContent />
        </Router>
      </PatientProvider>
    </AuthProvider>
  );
}

export default App;