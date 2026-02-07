import { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Header from './components/Layout/Header';
import Footer from './components/Footer';
import './App.css';

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Use multiple methods to ensure scroll works across all browsers
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  return null;
}

// Loading fallback component
function PageLoader() {
  return (
    <div className="page-loader">
      <p>Loading...</p>
    </div>
  );
}

// Lazy load page components for code splitting
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const MatchesPage = lazy(() => import('./pages/MatchesPage'));
const MessagesPage = lazy(() => import('./pages/MessagesPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const EditProfilePage = lazy(() => import('./pages/EditProfilePage'));
const InvitePage = lazy(() => import('./pages/InvitePage'));
const WelcomePage = lazy(() => import('./pages/WelcomePage'));
const CommunityPage = lazy(() => import('./pages/CommunityPage'));
const JoinCommunityPage = lazy(() => import('./pages/JoinCommunityPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const MyCommunitiesPage = lazy(() => import('./pages/MyCommunitiesPage'));
const ExplorePage = lazy(() => import('./pages/ExplorePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

// Pages that should not show the footer
const NO_FOOTER_PAGES = ['/my-communities'];
const NO_FOOTER_PREFIXES = ['/community/'];

function AppContent() {
  const { pathname } = useLocation();
  const showFooter = !NO_FOOTER_PAGES.includes(pathname) &&
    !NO_FOOTER_PREFIXES.some(prefix => pathname.startsWith(prefix));

  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/matches" element={<MatchesPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/chat/:userId" element={<ChatPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/edit" element={<EditProfilePage />} />
            <Route path="/user/:userId" element={<ProfilePage />} />
            <Route path="/invite" element={<InvitePage />} />
            <Route path="/welcome" element={<WelcomePage />} />
            <Route path="/community/:communityId" element={<CommunityPage />} />
            <Route path="/join/:inviteCode" element={<JoinCommunityPage />} />
            <Route path="/dashboard" element={<Navigate to="/my-communities?tab=channels" replace />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/communities" element={<Navigate to="/explore?tab=communities" replace />} />
            <Route path="/directory" element={<Navigate to="/explore?tab=directory" replace />} />
            <Route path="/my-communities" element={<MyCommunitiesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Suspense>
      </main>
      {showFooter && <Footer />}
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <Router>
        <ScrollToTop />
        <AppContent />
      </Router>
    </AppProvider>
  );
}

export default App;
