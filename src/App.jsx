import { Toaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import PageNotFound from './lib/PageNotFound';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import ExploreDegrees from './pages/ExploreDegrees';
import ExploreTopics from './pages/ExploreTopics';
import InterestMatcher from './pages/InterestMatcher';
import DreamLocation from './pages/DreamLocation';
import Recommendations from './pages/Recommendations';
import Trends from './pages/Trends';
import Compare from './pages/Compare';
import CareerDetail from './pages/CareerDetail';
import SkillTracker from './pages/SkillTracker';
import Opportunities from './pages/Opportunities';
import CareerSimulator from './pages/CareerSimulator';
import Community from './pages/Community';
import FutureScore from './pages/FutureScore';
import PersonalityQuiz from './pages/PersonalityQuiz';
import Achievements from './pages/Achievements';
import CounselorReport from './pages/CounselorReport';
import CareerCertificate from './pages/CareerCertificate';
import SuccessStarter from './pages/SuccessStarter';
import SuccessPro from './pages/SuccessPro';
import SuccessUnlimited from './pages/SuccessUnlimited';
import DeleteAccount from './pages/DeleteAccount';
import Privacy from './pages/Privacy';
import Success from './pages/Success';
import Login from './pages/Login';
import { isAuthenticated } from '@/lib/auth';

// Shown while we check auth — prevents any flash of wrong page
const AuthSpinner = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
    <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
  </div>
);

const PageTransition = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.15, ease: "easeOut" }}
  >
    {children}
  </motion.div>
);

const AppRoutes = () => {
  const location = useLocation();
  // null = still checking, true = logged in, false = not logged in
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    isAuthenticated()
      .then(authed => {
        setIsLoggedIn(!!authed);
        setAuthChecked(true);
      })
      .catch(() => {
        setIsLoggedIn(false);
        setAuthChecked(true);
      });
  }, []);

  // Always show spinner until we know auth state — no flash possible
  if (!authChecked) return <AuthSpinner />;

  // Logged-in user hits "/" → send to dashboard
  if (isLoggedIn && location.pathname === "/") {
    return <Navigate to="/dashboard" replace />;
  }

  // Allow success pages without auth
  const PUBLIC_PATHS = ["/", "/login", "/success", "/success-starter", "/success-pro", "/success-unlimited", "/delete-account", "/privacy"];

  // Unauthenticated user hits any protected route → redirect to "/"
  if (!isLoggedIn && !PUBLIC_PATHS.includes(location.pathname)) {
    return <Navigate to="/" replace />;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        {/* Public */}
        <Route path="/" element={
          <PageTransition><Landing /></PageTransition>
        } />
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        <Route path="/success" element={<PageTransition><Success /></PageTransition>} />
        <Route path="/success-starter" element={<PageTransition><SuccessStarter /></PageTransition>} />
        <Route path="/success-pro" element={<PageTransition><SuccessPro /></PageTransition>} />
        <Route path="/success-unlimited" element={<PageTransition><SuccessUnlimited /></PageTransition>} />
        <Route path="/delete-account" element={<DeleteAccount />} />
        <Route path="/privacy" element={<Privacy />} />

        {/* Private — all wrapped in sidebar Layout */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
          <Route path="/explore-degrees" element={<PageTransition><ExploreDegrees /></PageTransition>} />
          <Route path="/explore-topics" element={<PageTransition><ExploreTopics /></PageTransition>} />
          <Route path="/interest-matcher" element={<PageTransition><InterestMatcher /></PageTransition>} />
          <Route path="/dream-location" element={<PageTransition><DreamLocation /></PageTransition>} />
          <Route path="/recommendations" element={<PageTransition><Recommendations /></PageTransition>} />
          <Route path="/trends" element={<PageTransition><Trends /></PageTransition>} />
          <Route path="/compare" element={<PageTransition><Compare /></PageTransition>} />
          <Route path="/career-detail" element={<PageTransition><CareerDetail /></PageTransition>} />
          <Route path="/skill-tracker" element={<PageTransition><SkillTracker /></PageTransition>} />
          <Route path="/opportunities" element={<PageTransition><Opportunities /></PageTransition>} />
          <Route path="/career-simulator" element={<PageTransition><CareerSimulator /></PageTransition>} />
          <Route path="/community" element={<PageTransition><Community /></PageTransition>} />
          <Route path="/future-score" element={<PageTransition><FutureScore /></PageTransition>} />
          <Route path="/personality" element={<PageTransition><PersonalityQuiz /></PageTransition>} />
          <Route path="/achievements" element={<PageTransition><Achievements /></PageTransition>} />
          <Route path="/counselor-report" element={<PageTransition><CounselorReport /></PageTransition>} />
          <Route path="/certificate" element={<PageTransition><CareerCertificate /></PageTransition>} />
          <Route path="*" element={<PageNotFound />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <AppRoutes />
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;