import "./Hero.css"
import { NavLink, useNavigate } from "react-router-dom";
import { HiArrowRight } from "react-icons/hi2"
import { useUserRole } from "../../hooks/useAuthStatus";
import { MENTOR_HOME, STUDENT_HOME } from "../../components/AuthGate";

const DEFAULT_ILLUSTRATION_SRC =
    "https://framerusercontent.com/images/UcRcemWjmvw9CDCy1JIXixcBqg.svg?width=500&height=500&kb=48"

export default function Hero({ illustrationSrc = DEFAULT_ILLUSTRATION_SRC }) {
    const navigate = useNavigate();
    const { isAuthenticated, role } = useUserRole();
    const dashboardHome = role === "mentor" ? MENTOR_HOME : STUDENT_HOME;

    const handleLoginClick = (e) => {
        e.preventDefault();
        navigate(isAuthenticated ? dashboardHome : "/login");
    };
    return (
        <section className="hero" aria-labelledby="kalvium-hero-title">
            <div className="hero__container">
                <header className="hero__content">
                    <p className="hero__eyebrow">
                        WELCOME TO KALVIUM PORTFOLIO PLATFORM
                    </p>
                    <h1 id="kalvium-hero-title" className="hero__title">
                        The Professional Network for{" "}
                        <span className="hero__title-accent">
                            Kalvium Students
                        </span>
                    </h1>
                    <p className="hero__description">
                        A centralized portfolio platform where Kalvium students
                        showcase projects, achievements, and professional growth
                        while mentors discover and support talent.
                    </p>
                    <nav className="hero__actions" aria-label="Hero actions">
                        <NavLink
                            to="/students"
                            className="hero__button hero__button--primary"
                        >
                            <span>Explore Students</span>
                            <HiArrowRight
                                aria-hidden="true"
                                focusable="false"
                            />
                        </NavLink>
                        <NavLink
                            to={isAuthenticated ? dashboardHome : "/login"}
                            href="#"
                            onClick={handleLoginClick}
                            className="hero__button hero__button--secondary"
                        >
                            <span>{isAuthenticated ? "Go to Dashboard" : "Login to Dashboard"}</span>
                        </NavLink>
                    </nav>
                </header>

                <article className="hero__media-card">
                    <img
                        className="hero__illustration"
                        src={illustrationSrc}
                        alt="Kalvium student portfolio dashboard illustration"
                    />
                </article>
            </div>
        </section>
    )
}
