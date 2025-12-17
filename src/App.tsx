import { useEffect } from 'react';
import { Routes, Route, useSearchParams, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Generator from './pages/Generator';
import Pricing from './pages/Pricing';
import Dashboard from './pages/Dashboard';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Help from './pages/Help';
import Resources from './pages/Resources';
import Updates from './pages/Updates';
import Tutorial from './pages/Tutorial';
import Settings from './pages/Settings';
import { resumeSession, fetchCurrentUser } from './api/authApi';
import { useAuthStore } from './store/authStore';
import { migrateLegacyLocalStorage } from './utils/localMigration';
import NotificationSystem from './components/NotificationSystem';
import ToastContainer from './components/ToastContainer';
import AIPromptGenerator from './pages/AIPromptGenerator';
import PaymentSuccess from './pages/PaymentSuccess';
import FantasyNameGenerator from './pages/FantasyNameGenerator';
import MicroNovelStarterPage from './pages/MicroNovelStarterPage';
import PointsNotification from './components/PointsNotification';
import { PointsProvider } from './context/PointsContext';

// OAuth callback handler component
function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setToken = useAuthStore((state) => state.setToken);

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      navigate('/login?error=oauth_failed');
      return;
    }

    if (token) {
      setToken(token);
      // Store token in localStorage
      localStorage.setItem('auth_token', token);
      
      // ✅ P0: 获取用户信息（包括头像）
      fetchCurrentUser()
        .then((user) => {
          if (user) {
            navigate('/dashboard');
          } else {
            navigate('/login?error=user_fetch_failed');
          }
        })
        .catch((error) => {
          console.error('Failed to fetch user after OAuth:', error);
          navigate('/login?error=user_fetch_failed');
        });
    } else {
      navigate('/login?error=no_token');
    }
  }, [searchParams, navigate, setToken]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-slate-600">Completing login...</p>
    </div>
  );
}

function App() {
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    migrateLegacyLocalStorage();
  }, []);

  useEffect(() => {
    resumeSession();
  }, [token]);

  return (
    <PointsProvider>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/generator" element={<Generator />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/help" element={<Help />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/updates" element={<Updates />} />
            <Route path="/tutorials/:slug" element={<Tutorial />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/ai-prompt-generator" element={<AIPromptGenerator />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/tools/fantasy-name-generator" element={<FantasyNameGenerator />} />
            <Route path="/tools/story-starter" element={<MicroNovelStarterPage />} />
            <Route path="/auth/callback" element={<OAuthCallback />} />
          </Routes>
        </main>
        <Footer />
        <NotificationSystem />
        <ToastContainer />
        <PointsNotification />
      </div>
    </PointsProvider>
  );
}

export default App;

