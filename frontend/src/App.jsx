import { Navigate, Routes, Route, useLocation, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import Home from "./pages/Home/Home.jsx";
import Navbar from "./components/Navbar.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import Footer from "./components/Footer";
import IndividualStudentPortfolio from "./pages/IndividualStudentPortfolio";
import Students from "./pages/Students";
import Leaderboard from "./pages/LeaderBoard/leaderboard.jsx";
import EditProfile from "./pages/studentdashboard/EditProfile";
import PendingReviewPage from "./pages/studentdashboard/PendingReviewPage";
import ErrorPage from "./pages/ErrorPage/404page";
import AuthGate from "./components/AuthGate";
import MentorDashboard from "./pages/MentorDashboard/mentordashboard.jsx";
import { getPendingReviewStatus } from "./api/routes/StudentDashboard/dashboard.js";
import Policypage from "./pages/policy-page/policypage.jsx"

function LegacyStudentRedirect() {
  const { user_id } = useParams();

  if (!user_id || user_id === "undefined") {
    return <Navigate to="/students" replace />;
  }

  return <Navigate to={`/portfolio/${user_id}`} replace />;
}

function DashboardDispatcher({ user }) {
  const role = user?.user_metadata?.role ?? user?.app_metadata?.role;
  const [pendingReviewData, setPendingReviewData] = useState(null);
  const [isLoadingReview, setIsLoadingReview] = useState(true);

  // Check if student has pending reviews
  useEffect(() => {
    if (role !== "student") {
      setIsLoadingReview(false);
      return;
    }

    let isMounted = true;

    async function checkPendingReview() {
      try {
        const reviewStatus = await getPendingReviewStatus();
        if (isMounted && reviewStatus) {
          setPendingReviewData(reviewStatus);
        }
      } catch (error) {
        console.error("Error checking pending review status:", error);
      } finally {
        if (isMounted) {
          setIsLoadingReview(false);
        }
      }
    }

    checkPendingReview();

    return () => {
      isMounted = false;
    };
  }, [role]);

  if (role === "student") {
    // Show loading state while checking pending reviews
    if (isLoadingReview) {
      return (
        <div style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        }}>
          <div style={{
            textAlign: "center",
            color: "white",
          }}>
            <div style={{
              width: "50px",
              height: "50px",
              border: "4px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "50%",
              borderTop: "4px solid white",
              animation: "spin 1s linear infinite",
              margin: "0 auto 1rem",
            }}></div>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
            <p>Loading dashboard...</p>
          </div>
        </div>
      );
    }

    // If student has pending reviews, show the pending review page
    if (pendingReviewData?.hasPendingReview) {
      return <PendingReviewPage reviewData={pendingReviewData} />;
    }

    // Otherwise show the normal student dashboard
    return <EditProfile />;
  }

  if (role === "mentor") {
    return <MentorDashboard profile={user} />;
  }

  return <Navigate to="/login" replace />;
}

function App() {
  const location = useLocation();

  const showNavbar =
    location.pathname !== "/login" && !location.pathname.startsWith("/dashboard");
  const showFooter =
    location.pathname !== "/login" && !location.pathname.startsWith("/dashboard");

  return (
    <>
      {showNavbar && <Navbar />}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/students" element={<Students />} />
        <Route path="/student/:user_id" element={<LegacyStudentRedirect />} />
        <Route path="/portfolio/:user_id" element={<IndividualStudentPortfolio />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/policy" element={<Policypage />} />

        {/* Protected Dashboard Route using AuthGate */}
        <Route
          path="/dashboard"
          element={
            <AuthGate>
              {(user) => <DashboardDispatcher user={user} />}
            </AuthGate>
          }
        />

        <Route path="*" element={<ErrorPage />} />
      </Routes>

      {showFooter && <Footer />}
    </>
  );
}

export default App;