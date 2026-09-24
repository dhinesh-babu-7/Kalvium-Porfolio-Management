import { Navigate, Routes, Route, useLocation, useParams } from "react-router-dom";
import Home from "./pages/Home/Home.jsx";
import Navbar from "./components/Navbar.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import Footer from "./components/Footer";
import IndividualStudentPortfolio from "./pages/IndividualStudentPortfolio";
import StudentProjectDetails from "./pages/StudentProjectDetails";
import StudentProjectsAll from "./pages/StudentProjectsAll";
import Students from "./pages/Students";
import Leaderboard from "./pages/LeaderBoard/leaderboard.jsx";
import EditProfile from "./pages/studentdashboard/EditProfile";
import ErrorPage from "./pages/ErrorPage/404page";
import AuthGate, { STUDENT_HOME, MENTOR_HOME } from "./components/AuthGate";
import MentorDashboard from "./pages/MentorDashboard/mentordashboard.jsx";
import { DEFAULT_TAB, MENTOR_TABS, STUDENT_TABS } from "./pages/MentorDashboard/dashboardRoutes.js";
import { getUserRole } from "./hooks/useAuthStatus";

function LegacyStudentRedirect() {
  const { user_id } = useParams();

  if (!user_id || user_id === "undefined") {
    return <Navigate to="/students" replace />;
  }

  return <Navigate to={`/portfolio/${user_id}`} replace />;
}

function DashboardDispatcher({ user }) {
  const role = getUserRole(user);

  if (role === "student") {
    return <Navigate to={STUDENT_HOME} replace />;
  }

  if (role === "mentor") {
    return <Navigate to={MENTOR_HOME} replace />;
  }

  return <Navigate to="/login" replace />;
}

const STUDENT_TAB_SET = new Set(STUDENT_TABS);
const MENTOR_TAB_SET = new Set(MENTOR_TABS);

// Guards deep links like /student/dashboard/foobar — unknown slugs bounce
// to the role home instead of rendering a blank tab. The default tab is
// canonicalized onto the bare base path, so /mentor/dashboard/dashboard
// redirects down to /mentor/dashboard rather than being a second live URL.
function TabGuard({ allowed, fallback, children }) {
  const { tab } = useParams();
  if (tab && (tab === DEFAULT_TAB || !allowed.has(tab))) {
    return <Navigate to={fallback} replace />;
  }
  return children;
}

function App() {
  const location = useLocation();

  // Chrome is hidden only inside the dashboard areas themselves, matched per
  // path segment — the old `startsWith("/mentor/dashboard")` also swallowed
  // typos like /mentor/dashboardfoo, which then rendered the 404 *without* the
  // site Navbar/Footer. /login keeps the chrome too, as before.
  const { pathname } = location;
  const inArea = (base) => pathname === base || pathname.startsWith(`${base}/`);
  const hideChrome =
    inArea("/dashboard") ||
    inArea("/student/dashboard") ||
    inArea("/mentor/dashboard");
  const showNavbar = !hideChrome;
  const showFooter = !hideChrome;

  return (
    <>
      {showNavbar && <Navbar />}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/students" element={<Students />} />
        <Route path="/student/:user_id" element={<LegacyStudentRedirect />} />
        <Route path="/portfolio/:user_id" element={<IndividualStudentPortfolio />} />
        <Route path="/portfolio/:user_id/projects" element={<StudentProjectsAll />} />
        <Route path="/portfolio/:user_id/projects/:project_slug" element={<StudentProjectDetails />} />
        <Route path="/leaderboard" element={<Leaderboard />} />

        {/* Role-based dashboards — students and mentors are fenced off from
            each other's area by AuthGate's allowedRoles check. The default
            "Dashboard" tab renders at the bare base path. */}
        <Route
          path="/student/dashboard"
          element={
            <AuthGate allowedRoles={["student"]}>
              <EditProfile />
            </AuthGate>
          }
        />
        <Route
          path="/student/dashboard/:tab"
          element={
            <AuthGate allowedRoles={["student"]}>
              <TabGuard allowed={STUDENT_TAB_SET} fallback={STUDENT_HOME}>
                <EditProfile />
              </TabGuard>
            </AuthGate>
          }
        />
        <Route
          path="/mentor/dashboard"
          element={
            <AuthGate allowedRoles={["mentor"]}>
              {(user) => <MentorDashboard profile={user} />}
            </AuthGate>
          }
        />
        <Route
          path="/mentor/dashboard/:tab"
          element={
            <AuthGate allowedRoles={["mentor"]}>
              {(user) => (
                <TabGuard allowed={MENTOR_TAB_SET} fallback={MENTOR_HOME}>
                  <MentorDashboard profile={user} />
                </TabGuard>
              )}
            </AuthGate>
          }
        />

        {/* Legacy /dashboard entry: keeps old bookmarks working by bouncing
            each role to its new home. */}
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