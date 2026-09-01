import "./Footer.css";
import { FaGithub, FaEnvelope , FaLifeRing } from "react-icons/fa";
import { NavLink } from "react-router-dom";

function Footer() {
    return (
        <footer className="footer">
            <div className="footer-container">

                {/* Brand */}
                <div className="footer-brand">
                    <h1>KALVIUM</h1>

                    <p>
                        Empowering Kalvium students to showcase their talent
                        and build a brighter future.
                    </p>

                    <div className="social-icons">
                        <a
                            href="https://github.com/dhinesh-babu-7/Kalvium-Porfolio-Management"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="GitHub"
                        >
                            <FaGithub />
                            <span>GitHub</span>
                        </a>

                        <a
                            href="mailto:kpm-squad@googlegroups.com"
                            aria-label="Email"
                        >
                            <FaEnvelope />
                            <span>Email</span>
                        </a>
                        <a 
                            href="https://kpm-support.freedev.app/" 
                            target="_blank" 
                            rel="noopener noreferrer">
                            <FaLifeRing />
                            <span>Support</span>
                        </a>
                    </div>
                </div>

                {/* About */}
                <div className="footer-section">
                    <h3>About</h3>

                    <NavLink to="/">
                        About
                    </NavLink>

                    <a href="#features">
                        Features
                    </a>
                </div>

                {/* Students */}
                <div className="footer-section">
                    <h3>Students</h3>

                    <NavLink to="/students">
                        Students
                    </NavLink>

                    <NavLink to="/leaderboard">
                        Leaderboard
                    </NavLink>
                </div>

                {/* Contact */}
                <div className="footer-section">
                    <h3>Contact</h3>

                    <a href="mailto:kpm-squad@googlegroups.com">
                        Email Us
                    </a>

                    <a
                        href="https://kpm-support.freedev.app/"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Team support
                    </a>
                </div>

                {/* Legal */}
                <div className="footer-section">
                    <h3>Legal</h3>

                    <NavLink  to="/policy">
                        Privacy
                    </NavLink>

                    <a href="#terms">
                        Terms
                    </a>
                </div>

            </div>

            {/* Bottom Section */}
            <div className="footer-bottom">

                <div className="footer-divider"></div>

                <p className="footer-disclaimer">
                    Disclaimer: Kalvium Portfolio Management is an independent
                    student project created by students for educational and
                    portfolio purposes. The use of the name and logo "Kalvium"
                    is solely for identification and project context. This
                    project is not affiliated, associated, authorized, endorsed
                    by, or in any way officially connected with Kalvium or any
                    of its subsidiaries.
                </p>

                <p className="copyright">
                    © 2026 Kalvium Portfolio. All rights reserved.
                </p>

            </div>
        </footer>
    );
}

export default Footer;