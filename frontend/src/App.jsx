import { Navigate, Routes, Route, useLocation, useParams } from "react-router-dom";
import Home from "./pages/Home/Home.jsx";
import Navbar from "./components/Navbar.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import Footer from "./components/Footer";
import IndividualStudentPortfolio from "./pages/IndividualStudentPortfolio";
import Students from "./pages/Students";
import Leaderboard from "./pages/LeaderBoard/leaderboard.jsx";
import EditProfile from "./pages/studentdashboard/EditProfile";
import ErrorPage from "./pages/ErrorPage/404page";
import AuthGate from "./components/AuthGate";
import MentorDashboard from "./pages/MentorDashboard/mentordashboard.jsx";

function LegacyStudentRedirect() {
  const { user_id } = useParams();

  if (!user_id || user_id === "undefined") {
    return <Navigate to="/students" replace />;
  }

  return <Navigate to={`/portfolio/${user_id}`} replace />;
}

function DashboardDispatcher({ user }) {
  const role = user?.user_metadata?.role ?? user?.app_metadata?.role;

  if (role === "student") {
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