import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Header from './components/Layout/Header';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DirectoryPage from './pages/DirectoryPage';
import DiscoverPage from './pages/DiscoverPage';
import MatchesPage from './pages/MatchesPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import InvitePage from './pages/InvitePage';
import PremiumPage from './pages/PremiumPage';
import './App.css';

function App() {
  return (
    <AppProvider>
      <Router>
        <div className="app">
          <Header />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/directory" element={<DirectoryPage />} />
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/matches" element={<MatchesPage />} />
            <Route path="/chat/:userId" element={<ChatPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/user/:userId" element={<ProfilePage />} />
            <Route path="/invite" element={<InvitePage />} />
            <Route path="/premium" element={<PremiumPage />} />
          </Routes>
        </div>
      </Router>
    </AppProvider>
  );
}

export default App;
