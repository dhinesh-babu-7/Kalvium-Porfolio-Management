import { useEffect } from "react";
import "./Policypage.css";

const TermsOfUse = () => {
    useEffect(() => {
        document.title = "Terms of Use | Kalvium Portfolio Management (KPM)";
    }, []);

    return (
        <main className="privacy-policy">
            <h1>Terms of Use</h1>

            <h2>Intellectual Property Rights &amp; Restrictions on Use</h2>

            <h3>Ownership of Platform and Design</h3>
            <p>All content, features, functionality, user interface (UI) layouts, user experience (UX) workflows, visual designs, graphics, database structures, and source code associated with <strong>Kalvium Portfolio Management (KPM)</strong> (<a href="https://kalvium-portfolio.vercel.app">https://kalvium-portfolio.vercel.app</a>) are the exclusive intellectual property of the copyright holders (<strong>Ashwath, Dhinesh Babu, Ashwin Raj, and Nithyanandharaj</strong>) and are protected under applicable copyright, trademark, and intellectual property laws in India and internationally.</p>

            <h3>Strictly Prohibited Activities</h3>
            <p>You may access and use the Service solely for its intended educational and portfolio management purposes. Without prior <strong>written permission</strong> from the copyright holders (<a href="mailto:kpm-squad@googlegroups.com">kpm-squad@googlegroups.com</a>), you are strictly prohibited from:</p>
            <ol>
                <li><strong>Cloning or Replicating the Platform:</strong> Copying, reproducing, duplicating, or recreating the Service&apos;s UI design, dashboard layout, component structure, visual theme, or functional workflows—whether for personal, educational, open-source, or commercial projects.</li>
                <li><strong>Derivative Works:</strong> Modifying, adapting, translating, or building derivative software, templates, or competing student/mentor portfolio systems modeled directly on KPM&apos;s design or architecture.</li>
                <li><strong>Reverse Engineering &amp; Scraping:</strong> Decompiling, disassembling, reverse-engineering, inspecting to extract proprietary logic, or using automated bots/scrapers to harvest data, assets, or layout structures from the Website.</li>
                <li><strong>Unauthorized Redistribution:</strong> Publishing, hosting, sub-licensing, or distributing any part of the KPM codebase, design assets, or branding on public repositories (such as GitHub) or third-party platforms.</li>
            </ol>

            <h3>Permission Requests</h3>
            <p>No license or other rights are granted, whether express or implied, except with the prior written permission of the copyright holders. Any developer, student, or organization wishing to reference, adapt, or build upon any part of KPM&apos;s design or system must obtain explicit written authorization in advance by contacting <a href="mailto:kpm-squad@googlegroups.com"><strong>kpm-squad@googlegroups.com</strong></a>. Unauthorized reproduction or derivative use will result in repository/hosting takedown notices and legal action to the extent permitted by applicable law.</p>
        </main>
    );
};

export default TermsOfUse;