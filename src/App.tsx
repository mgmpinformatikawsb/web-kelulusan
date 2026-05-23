/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import LandingPage from './components/LandingPage';
import CekKelulusan from './components/CekKelulusan';
import AdminPanel from './components/AdminPanel';
import { AnnouncementSettings } from './types';

export default function App() {
  const [page, setPage] = useState<string>('landing');
  const [settings, setSettings] = useState<AnnouncementSettings | null>(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(!!localStorage.getItem('admin_token'));

  // Load public school settings on mount
  const fetchSettings = async () => {
    try {
      const resp = await fetch('/api/public/settings');
      const json = await resp.json();
      if (json.success) {
        setSettings(json.data);
      }
    } catch (err) {
      console.error('Failed to connect to school announcement server:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Track page visits securely once per window load session in browser
  useEffect(() => {
    const hasVisitedThisSession = sessionStorage.getItem('announcement_visitor_tracked');
    if (!hasVisitedThisSession) {
      fetch('/api/public/increment-visitors', { method: 'POST' })
        .then(res => res.json())
        .then(() => {
          sessionStorage.setItem('announcement_visitor_tracked', 'true');
        })
        .catch(err => console.error('Stats logger offline:', err));
    }
  }, []);

  const handleSettingsUpdate = (updatedSettings: AnnouncementSettings) => {
    setSettings(updatedSettings);
    // Sync header stats immediately
    fetchSettings();
  };

  const handleLogoutAdmin = () => {
    setIsAdminLoggedIn(false);
    setPage('landing');
  };

  // Sync admin authentication state when changing views
  const handlePageNavigation = (destination: string) => {
    setIsAdminLoggedIn(!!localStorage.getItem('admin_token'));
    setPage(destination);
    // Scroll smoothly to top on navigation to clear layouts
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginAdmin = () => {
    setIsAdminLoggedIn(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-gray-800 antialiased selection:bg-blue-100 selection:text-blue-900">
      
      {/* Header and navigation bar - Hide if admin is logged in on admin page */}
      {!(page === 'admin' && isAdminLoggedIn) && (
        <Header 
          settings={settings} 
          onNavigate={handlePageNavigation} 
          isAdmin={isAdminLoggedIn} 
        />
      )}

      {/* Main Page Content Body */}
      <main className={`flex-grow w-full mx-auto transition-all ${
        (page === 'admin' && isAdminLoggedIn) 
          ? 'px-4 sm:px-6 lg:px-8 py-6 max-w-7xl' 
          : 'max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-12'
      }`}>
        <div id="content-outlet" className="transition-all duration-300">
          {page === 'landing' && (
            <LandingPage 
              settings={settings} 
              onNavigate={handlePageNavigation} 
            />
          )}

          {page === 'cek' && (
            <CekKelulusan 
              settings={settings} 
              onNavigate={handlePageNavigation} 
            />
          )}

          {page === 'admin' && (
            <AdminPanel 
              appSettings={settings} 
              onSettingsUpdate={handleSettingsUpdate} 
              onLogoutTrigger={handleLogoutAdmin} 
              onLoginSuccess={handleLoginAdmin}
            />
          )}
        </div>
      </main>

      {/* Footer information panel - Hide if admin is logged in on admin page */}
      {!(page === 'admin' && isAdminLoggedIn) && (
        <Footer settings={settings} />
      )}

    </div>
  );
}
