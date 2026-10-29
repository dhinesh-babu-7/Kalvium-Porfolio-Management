import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./practise.css";

import Belt1 from "./belts/Belt1.jsx";
import Belt2 from "./belts/Belt2.jsx";
import Belt3 from "./belts/Belt3.jsx";
import Belt4 from "./belts/Belt4.jsx";
import Belt5 from "./belts/Belt5.jsx";
import Belt6 from "./belts/Belt6.jsx";
import Belt7 from "./belts/Belt7.jsx";

const STORAGE_KEY = "kalvium-practise-progress-v1";

const BELTS = [
    Belt1,
    Belt2,
    Belt3,
    Belt4,
    Belt5,
    Belt6,
    Belt7,
];

function readSavedProgress() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const parsed = saved ? JSON.parse(saved) : {};

        return parsed &&
            typeof parsed === "object" &&
            !Array.isArray(parsed)
            ? parsed
            : {};
    } catch {
        return {};
    }
}

function isTopicComplete(progress, topic) {
    return progress[topic.id]?.completed === true;
}

export default function Practise() {
    const navigate = useNavigate();
    const [progress] = useState(readSavedProgress);

    useEffect(() => {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(progress)
            );
        } catch {
            // Continue if browser storage is unavailable.
        }
    }, [progress]);

    const isBeltComplete = (belt) =>
        belt.topics.every((topic) =>
            isTopicComplete(progress, topic)
        );

    const isBeltUnlocked = (index) =>
        index === 0 || isBeltComplete(BELTS[index - 1]);

    const completedTopics = BELTS.reduce(
        (total, belt) =>
            total +
            belt.topics.filter((topic) =>
                isTopicComplete(progress, topic)
            ).length,
        0
    );

    const totalTopics = BELTS.reduce(
        (total, belt) => total + belt.topics.length,
        0
    );

    const overallPercentage = totalTopics > 0
        ? (completedTopics / totalTopics) * 100
        : 0;

    const openBelt = (belt) => {
        navigate(`/student/dashboard/practise/belt/${belt.id}`);
    };

    return (
        <div className="practise-page">
            <header className="practise-header">
                <div>
                    <p className="practise-eyebrow">
                        STUDENT DOJO
                    </p>

                    <h1>Practice</h1>

                    <p className="practise-header-description">
                        Learn each topic, solve practice problems,
                        and unlock the next belt.
                    </p>
                </div>

                <div className="practise-overall-progress">
                    <span className="practise-muted">
                        Overall Progress
                    </span>

                    <strong className="practise-progress-count">
                        {completedTopics} / {totalTopics} topics
                    </strong>

                    <div className="practise-progress-track">
                        <div
                            className="practise-progress-fill"
                            style={{ width: `${overallPercentage}%` }}
                        />
                    </div>
                </div>
            </header>

            <section className="practise-belts-section">
                <div className="practise-section-heading">
                    <div>
                        <h2>Your 7 Belts</h2>

                        <p className="practise-muted">
                            Complete every topic in a belt to
                            unlock the next belt.
                        </p>
                    </div>
                </div>

                <div className="practise-belts-grid">
                    {BELTS.map((belt, index) => {
                        const unlocked = isBeltUnlocked(index);
                        const completed = isBeltComplete(belt);

                        const finishedCount = belt.topics.filter(
                            (topic) =>
                                isTopicComplete(progress, topic)
                        ).length;

                        const percentage = belt.topics.length > 0
                            ? (finishedCount / belt.topics.length) * 100
                            : 0;

                        return (
                            <button
                                key={belt.id}
                                type="button"
                                className={[
                                    "practise-belt-card",
                                    completed ? "completed" : "",
                                    !unlocked ? "locked" : "",
                                ].filter(Boolean).join(" ")}
                                onClick={() => openBelt(belt)}
                            >
                                <span className="practise-belt-card-top">
                                    <strong>{belt.title}</strong>

                                    <span className="practise-belt-icon">
                                        {completed
                                            ? "✓"
                                            : unlocked
                                                ? "OPEN"
                                                : "🔒"}
                                    </span>
                                </span>

                                <span className="practise-belt-subtitle">
                                    {belt.subtitle}
                                </span>

                                <span className="practise-belt-count">
                                    {finishedCount} / {belt.topics.length} topics completed
                                </span>

                                <span className="practise-belt-progress-track">
                                    <span
                                        className="practise-belt-progress-fill"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </span>

                                <span className="practise-belt-hint">
                                    {completed
                                        ? "Belt completed"
                                        : unlocked
                                            ? "Open belt →"
                                            : `Locked — complete Belt ${belt.id - 1} first`}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </section>

            <p className="practise-demo-note">
                Demo version: progress is saved in this browser.
            </p>
        </div>
    );
}