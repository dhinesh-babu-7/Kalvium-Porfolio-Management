import { useEffect, useState } from "react";
import { Check, Copy, Mail, ShieldCheck } from "lucide-react";
import "./Policypage.css";

const licenseText = `PROPRIETARY SOFTWARE LICENSE

Copyright (c) 2026 Ashwath, Dhinesh Babu, Ashwin Raj, Nithyanandharaj (Kalvium Portfolio Management - KPM). All rights reserved.

This portfolio website (Kalvium Portfolio Management) and its associated source code, UI/UX design, dashboard layout, workflows, graphics, text, and other original materials are proprietary.

No person or organization may copy, clone, reproduce, modify, adapt, distribute, publish, sublicense, scrape, reverse-engineer, or create derivative works from any part of this work without obtaining prior written permission from the copyright holders.

Unauthorized use, copying, modification, or distribution is prohibited to the extent permitted by applicable law.

To request permission to use any part of this work, contact the copyright holders at kpm-squad@googlegroups.com.

No license or other rights are granted, whether express or implied, except with the prior written permission of the copyright holders.

All rights reserved.`;

const LicensePage = () => {
    const [copied, setCopied] = useState(false);
    const [copyFailed, setCopyFailed] = useState(false);

    useEffect(() => {
        document.title = "Proprietary Software License | Kalvium Portfolio Management (KPM)";
    }, []);

    const copyLicense = async () => {
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(licenseText);
            } else {
                throw new Error("Clipboard API unavailable");
            }
            setCopied(true);
            setCopyFailed(false);
        } catch {
            const textArea = document.createElement("textarea");
            textArea.value = licenseText;
            textArea.setAttribute("readonly", "");
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            document.body.appendChild(textArea);
            textArea.select();

            const fallbackSucceeded = document.execCommand("copy");
            textArea.remove();
            setCopied(fallbackSucceeded);
            setCopyFailed(!fallbackSucceeded);
        }
    };

    return (
        <main className="license-page">
            <div className="license-layout">
                <header className="license-header">
                    <div className="license-kicker">
                        <ShieldCheck aria-hidden="true" />
                        <span>KPM / LEGAL</span>
                        <span className="license-status">PROPRIETARY · 2026</span>
                    </div>
                    <div className="license-heading-row">
                        <div>
                            <h1>Proprietary Software License</h1>
                            <p>Ownership and permitted use of the KPM platform.</p>
                        </div>
                        <button className="license-copy-button" type="button" onClick={copyLicense}>
                            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                            {copied ? "Copied" : "Copy license"}
                        </button>
                    </div>
                    <span className="license-copy-feedback" aria-live="polite">
                        {copied ? "License copied to clipboard." : copyFailed ? "Copy failed. Please select and copy the license text." : ""}
                    </span>
                </header>

                <article className="license-document">
                    <div className="license-document-meta">
                        <span>LICENSE AGREEMENT</span>
                        <span>Effective 2026</span>
                    </div>
                    <h2>PROPRIETARY SOFTWARE LICENSE</h2>
                    <p className="license-copyright">Copyright (c) 2026 Ashwath, Dhinesh Babu, Ashwin Raj, Nithyanandharaj (Kalvium Portfolio Management - KPM). All rights reserved.</p>
                    <p>This portfolio website (Kalvium Portfolio Management) and its associated source code, UI/UX design, dashboard layout, workflows, graphics, text, and other original materials are proprietary.</p>
                    <p>No person or organization may copy, clone, reproduce, modify, adapt, distribute, publish, sublicense, scrape, reverse-engineer, or create derivative works from any part of this work without obtaining prior written permission from the copyright holders.</p>
                    <p>Unauthorized use, copying, modification, or distribution is prohibited to the extent permitted by applicable law.</p>
                    <p>To request permission to use any part of this work, contact the copyright holders at <a href="mailto:kpm-squad@googlegroups.com">kpm-squad@googlegroups.com</a>.</p>
                    <p>No license or other rights are granted, whether express or implied, except with the prior written permission of the copyright holders.</p>
                    <p className="license-reserved">All rights reserved.</p>
                </article>

                <aside className="license-contact">
                    <span className="license-contact-label">PERMISSION REQUESTS</span>
                    <h2>Need written approval?</h2>
                    <p>Contact the copyright holders before using or adapting any part of KPM.</p>
                    <a href="mailto:kpm-squad@googlegroups.com">
                        <Mail aria-hidden="true" />
                        Email the KPM team
                    </a>
                </aside>
            </div>
        </main>
    );
};

export default LicensePage;