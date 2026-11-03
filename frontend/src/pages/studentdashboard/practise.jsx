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
import {
    BELT_TOPIC_TOTALS,
    loadPracticeProgress,
} from "../../lib/practiceProgress.js";

const BELTS = [Belt1, Belt2, Belt3, Belt4, Belt5, Belt6, Belt7];

function isTopicComplete(topicProgress, topic) {
    return topicProgress[topic.id]?.completed === true;
}

export default function Practise() {
    const navigate = useNavigate();
    const [topicProgress, setTopicProgress] = useState({});
    const [beltProgress, setBeltProgress] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        loadPracticeProgress()
            .then(({ topicProgress: savedTopics, beltProgress: savedBelts }) => {
                if (!cancelled) {
                    setTopicProgress(savedTopics);
                    setBeltProgress(savedBelts);
                }
            })
            .catch((loadError) => {
                if (!cancelled) {
                    setError(
                        loadError.message ||
                        "Could not load your practice progress."
                    );
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const isBeltComplete = (belt) =>
        beltProgress[`belt_${belt.id}`]?.completed === true ||
        belt.topics.every((topic) => isTopicComplete(topicProgress, topic));

    const isBeltUnlocked = (index) =>
        index === 0 ||
        beltProgress[`belt_${index}`]?.completed === true;

    const completedTopics = BELTS.reduce(
        (total, belt) =>
            total +
            belt.topics.filter((topic) =>
                isTopicComplete(topicProgress, topic)
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

    return (
        <div className="practise-page">
            <header className="practise-header">
                <div>
                    <p className="practise-eyebrow">STUDENT DOJO</p>
                    <h1>Practice</h1>
                    <p className="practise-header-description">
                        Learn each topic, solve practice problems,
                        and unlock the next belt.
                    </p>
                </div>

                <div className="practise-overall-progress">
                    <span className="practise-muted">Overall Progress</span>
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

            {loading && (
                <p className="practise-help-text">
                    Loading your saved progress...
                </p>
            )}

            {error && (
                <p className="practise-help-text" role="alert">
                    {error}
                </p>
            )}

            <section className="practise-belts-section">
                <div className="practise-section-heading">
                    <div>
                        <h2>Your 7 Belts</h2>
                        <p className="practise-muted">
                            Complete every topic in a belt to unlock the next belt.
                        </p>
                    </div>
                </div>

                <div className="practise-belts-grid">
                    {BELTS.map((belt, index) => {
                        const unlocked = isBeltUnlocked(index);
                                        const beltSavedProgress =
                                            beltProgress[`belt_${belt.id}`] || {};
                                        const completed = beltSavedProgress.completed === true ||
                                            isBeltComplete(belt);
                                        const finishedCount = Number.isInteger(
                                            beltSavedProgress.completedTopics
                                        )
                                            ? beltSavedProgress.completedTopics
                                            : belt.topics.filter((topic) =>
                                                isTopicComplete(topicProgress, topic)
                                            ).length;
                                        const percentage = Number.isFinite(
                                            beltSavedProgress.completionPercentage
                                        )
                                            ? beltSavedProgress.completionPercentage
                                            : (finishedCount / BELT_TOPIC_TOTALS[belt.id]) * 100;

                        return (
                            <button
                                key={belt.id}
                                type="button"
                                className={[
                                    "practise-belt-card",
                                    completed ? "completed" : "",
                                    !unlocked ? "locked" : "",
                                ].filter(Boolean).join(" ")}
                                disabled={loading}
                                onClick={() =>
                                    navigate(
                                        `/student/dashboard/practise/belt/${belt.id}`
                                    )
                                }
                            >
                                <span className="practise-belt-card-top">
                                    <strong>{belt.title}</strong>
                                    <span className="practise-belt-icon">
                                        {completed ? "✓" : unlocked ? "OPEN" : "🔒"}
                                    </span>
                                </span>
                                <span className="practise-belt-subtitle">
                                    {belt.subtitle}
                                </span>
                                <span className="practise-belt-count">
                                    {finishedCount} / {BELT_TOPIC_TOTALS[belt.id]} topics completed
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
        </div>
    );
}
