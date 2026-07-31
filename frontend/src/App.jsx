import { Routes, Route, useLocation } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Navbar from "./components/Navbar.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import Footer from "./components/Footer";
import IndividualStudentPortfolio from "./pages/IndividualStudentPortfolio";
import Students from "./pages/Students";
import About from "./pages/About/About";
import EditProfile from "./pages/studentdashboard/EditProfile";
import ErrorPage from "./pages/ErrorPage/404page";
import AuthGate from "./components/AuthGate";
import MentorDashboard from "./pages/MentorDashboard/mentordashboard.jsx";


function App() {
  const location = useLocation();
  
  const isMentorDashboard = location.pathname === "/";
  const showNavbar = !isMentorDashboard && location.pathname !== "/login" && !location.pathname.startsWith("/dashboard");
  const showFooter = !isMentorDashboard && location.pathname !== "/login" && !location.pathname.startsWith("/dashboard");

  return (
    <>
      <title>Kalvium Portfolio | Home</title>

      {showNavbar && <Navbar />}

      <Routes>
        <Route path="/" element={<Home/>} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/students" element={<Students />} />
        <Route path="/profile/:id" element={<IndividualStudentPortfolio />} />
        <Route path="/about" element={<About />} />
        
        {/* Protected Dashboard Route using AuthGate */}
        <Route
          path="/dashboard"
          element={
            <AuthGate>
              <EditProfile />
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