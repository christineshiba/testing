import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Header from './components/Layout/Header';

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AuthCallback from './pages/AuthCallback';
import DirectoryPage from './pages/DirectoryPage';
import MatchesPage from './pages/MatchesPage';
import MessagesPage from './pages/MessagesPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import EditProfilePage from './pages/EditProfilePage';
import InvitePage from './pages/InvitePage';
import WelcomePage from './pages/WelcomePage';
import CommunityPage from './pages/CommunityPage';
import './App.css';

function App() {
  return (
    <AppProvider>
      <Router>
        <ScrollToTop />
        <div className="app">
          <Header />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/directory" element={<DirectoryPage />} />
                        <Route path="/matches" element={<MatchesPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/chat/:userId" element={<ChatPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/edit" element={<EditProfilePage />} />
            <Route path="/user/:userId" element={<ProfilePage />} />
            <Route path="/invite" element={<InvitePage />} />
            <Route path="/welcome" element={<WelcomePage />} />
            <Route path="/community/:communityId" element={<CommunityPage />} />
                      </Routes>
        </div>
      </Router>
    </AppProvider>
  );
}

export default App;
