import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./practise.css";
import { studentTabPath } from "../MentorDashboard/dashboardRoutes.js";

import {
    loadPracticeProgress,
    savePracticeTopicProgress,
} from "../../lib/practiceProgress.js";

const STORAGE_KEY = "kalvium-practise-progress-v1";

function readSavedProgress() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch {
        return {};
    }
}

function getTopicProgress(progress, topic) {
    const saved = progress[topic.id] || {};

    return {
        learned: saved.learned === true,
        solvedProblems: Array.isArray(saved.solvedProblems)
            ? saved.solvedProblems
            : [],
        completed: saved.completed === true,
    };
}

export default function BeltPage({ belt, locked = false }) {
    const navigate = useNavigate();

    const [progress, setProgress] = useState(readSavedProgress);

    const [userId, setUserId] = useState(null);
    const [progressLoading, setProgressLoading] = useState(true);
    const [progressError, setProgressError] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function fetchProgress() {
            setProgressLoading(true);
            setProgressError("");

            try {
                const result = await loadPracticeProgress();

                if (cancelled) return;

                setUserId(result.userId);

                setProgress((previous) => ({
                    ...previous,
                    ...result.progress,
                }));
            } catch (error) {
                if (!cancelled) {
                    setProgressError(
                        error.message || "Could not load saved progress."
                    );
                }
            } finally {
                if (!cancelled) {
                    setProgressLoading(false);
                }
            }
        }

        fetchProgress();

        return () => {
            cancelled = true;
        };
    }, []);

    const [openTopics, setOpenTopics] = useState(() => ({
        [belt.topics[0]?.id]: true,
    }));

    useEffect(() => {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(progress)
            );
        } catch {
            // The page remains usable if browser storage is unavailable.
        }
    }, [progress]);

    const topicProgress = (topic) =>
        getTopicProgress(progress, topic);

    const updateTopicProgress = (topic, changes) => {
        const nextTopicProgress = {
            ...getTopicProgress(progress, topic),
            ...changes,
        };

        const nextProgress = {
            ...progress,
            [topic.id]: nextTopicProgress,
        };

        // Update the page immediately.
        setProgress(nextProgress);

        // Save the change to Supabase.
        if (!userId) {
            setProgressError(
                "Your student account is not ready. Please reload the page."
            );
            return;
        }

        setProgressError("");

        savePracticeTopicProgress(
            userId,
            belt.id,
            topic.id,
            nextTopicProgress
        ).catch((error) => {
            setProgressError(
                error.message || "Could not save progress to Supabase."
            );
        });
    };

    const isBeltComplete = belt.topics.every(
        (topic) => topicProgress(topic).completed
    );

    const completedTopics = belt.topics.filter(
        (topic) => topicProgress(topic).completed
    ).length;

    const toggleTopic = (topicId) => {
        setOpenTopics((previous) => ({
            ...previous,
            [topicId]: !previous[topicId],
        }));
    };

    const toggleProblem = (topic, problemIndex) => {
        const status = topicProgress(topic);

        if (!status.learned || status.completed) return;

        const solved = new Set(status.solvedProblems);

        if (solved.has(problemIndex)) {
            solved.delete(problemIndex);
        } else {
            solved.add(problemIndex);
        }

        updateTopicProgress(topic, {
            solvedProblems: [...solved],
        });
    };

    const completeTopic = (topic) => {
        const status = topicProgress(topic);

        const allProblemsSolved = topic.problems.every(
            (_, index) => status.solvedProblems.includes(index)
        );

        if (!status.learned || !allProblemsSolved) return;

        updateTopicProgress(topic, {
            completed: true,
        });
    };

    return (
        <div className="practise-page">
            <header className="practise-header">
                <div>
                    <p className="practise-eyebrow">
                        STUDENT DOJO / {belt.title.toUpperCase()}
                    </p>

                    <h1>{belt.title}</h1>

                    <p className="practise-header-description">
                        {belt.subtitle}
                    </p>
                </div>

                <div className="practise-overall-progress">
                    <span className="practise-muted">
                        Belt Progress
                    </span>

                    <strong className="practise-progress-count">
                        {completedTopics} / {belt.topics.length} topics
                    </strong>

                    <div className="practise-progress-track">
                        <div
                            className="practise-progress-fill"
                            style={{
                                width: `${(completedTopics / belt.topics.length) * 100
                                    }%`,
                            }}
                        />
                    </div>
                </div>
            </header>

            {progressLoading && (
                <p className="practise-help-text">
                    Loading your saved progress...
                </p>
            )}

            {progressError && (
                <p className="practise-help-text" role="alert">
                    {progressError}
                </p>
            )}

            <section className="practise-open-belt">
                <header className="practise-open-belt-header">
                    <div>
                        <button
                            type="button"
                            className="practise-back-button"
                            onClick={() =>
                                navigate(studentTabPath("practise"))
                            }
                        >
                            ← Back to All Belts
                        </button>

                        <h2>{belt.subtitle}</h2>

                        <p className="practise-muted">
                            Learn each topic, open its resources, and
                            complete the practice problems.
                        </p>
                    </div>
                </header>

                {locked ? (
                    <div className="practise-locked-message practise-belt-locked-message">
                        <strong>{belt.title} is locked.</strong>
                        <span>
                            Complete every topic in Belt {belt.id - 1} to unlock
                            this belt.
                        </span>
                    </div>
                ) : (
                    <div className="practise-topic-list">
                        {belt.topics.map((topic, index) => {
                            const status = topicProgress(topic);
                            const expanded = Boolean(openTopics[topic.id]);

                            const learningResource = topic.resources.find(
                                (resource) =>
                                    resource.title.startsWith(
                                        "Learning Resource"
                                    )
                            );

                            const practiceResources = topic.resources.filter(
                                (resource) =>
                                    resource.title.startsWith("Practice")
                            );

                            const allProblemsSolved = topic.problems.every(
                                (_, problemIndex) =>
                                    status.solvedProblems.includes(problemIndex)
                            );

                            return (
                                <article
                                    key={topic.id}
                                    className={[
                                        "practise-topic-card",
                                        expanded ? "expanded" : "",
                                        status.completed ? "completed" : "",
                                    ].join(" ")}
                                >
                                    <button
                                        type="button"
                                        className="practise-topic-summary"
                                        onClick={() => toggleTopic(topic.id)}
                                        aria-expanded={expanded}
                                    >
                                        <span className="practise-topic-number">
                                            {String(index + 1).padStart(2, "0")}
                                        </span>

                                        <span className="practise-topic-name">
                                            <strong>{topic.title}</strong>

                                            <small>
                                                {status.completed
                                                    ? "Topic completed ✓"
                                                    : status.learned
                                                        ? `${status.solvedProblems.length}/${topic.problems.length} problems completed`
                                                        : "Learning resources and practice"}
                                            </small>
                                        </span>

                                        <span className="practise-topic-chevron">
                                            {expanded ? "−" : "+"}
                                        </span>
                                    </button>

                                    {expanded && (
                                        <div className="practise-topic-body">
                                            <section className="practise-resource-section">
                                                <h3>1. Learning Resources</h3>

                                                <p>
                                                    Study the learning material for{" "}
                                                    {topic.title} before starting
                                                    the exercises.
                                                </p>

                                                {learningResource && (
                                                    <a
                                                        className="practise-resource-link"
                                                        href={learningResource.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <span className="practise-resource-title">
                                                            📘 {learningResource.title}
                                                        </span>

                                                        <span className="practise-resource-action">
                                                            Open learning resource ↗
                                                        </span>
                                                    </a>
                                                )}

                                                {!status.learned &&
                                                    !status.completed && (
                                                        <button
                                                            type="button"
                                                            className="practise-primary-button"
                                                            disabled={progressLoading}
                                                            onClick={() =>
                                                                updateTopicProgress(
                                                                    topic,
                                                                    { learned: true }
                                                                )
                                                            }
                                                        >
                                                            I've finished learning —
                                                            Start Practice
                                                        </button>
                                                    )}

                                                {status.learned && (
                                                    <div className="practise-learned-status">
                                                        ✓ Learning completed
                                                    </div>
                                                )}
                                            </section>

                                            <section className="practise-problems-section">
                                                <h3>2. Practice Problems</h3>

                                                {!status.learned ? (
                                                    <div className="practise-locked-message">
                                                        Finish the learning section
                                                        to unlock practice problems.
                                                    </div>
                                                ) : (
                                                    <>
                                                        {practiceResources.map((resource) => (
                                                            <a
                                                                key={resource.title}
                                                                className="practise-resource-link"
                                                                href={resource.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                            >
                                                                <span className="practise-resource-title">
                                                                    💻 {resource.title}
                                                                </span>

                                                                <span className="practise-resource-action">
                                                                    Open practice ↗
                                                                </span>
                                                            </a>
                                                        ))}

                                                        <p>
                                                            Solve each problem and
                                                            check it when finished.
                                                        </p>

                                                        {topic.problems.map(
                                                            (problem, problemIndex) => {
                                                                const solved =
                                                                    status.solvedProblems.includes(
                                                                        problemIndex
                                                                    );

                                                                return (
                                                                    <label
                                                                        key={`${topic.id}-${problemIndex}`}
                                                                        className={[
                                                                            "practise-problem",
                                                                            solved ? "solved" : "",
                                                                        ].join(" ")}
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={solved}
                                                                            disabled={
                                                                                status.completed
                                                                            }
                                                                            onChange={() =>
                                                                                toggleProblem(
                                                                                    topic,
                                                                                    problemIndex
                                                                                )
                                                                            }
                                                                        />

                                                                        <span className="practise-problem-text">
                                                                            <strong>
                                                                                Problem{" "}
                                                                                {problemIndex + 1}
                                                                            </strong>

                                                                            <span>
                                                                                {problem}
                                                                            </span>
                                                                        </span>
                                                                    </label>
                                                                );
                                                            }
                                                        )}

                                                        <button
                                                            type="button"
                                                            className="practise-primary-button"
                                                            disabled={
                                                                status.completed ||
                                                                !allProblemsSolved
                                                            }
                                                            onClick={() =>
                                                                completeTopic(topic)
                                                            }
                                                        >
                                                            {status.completed
                                                                ? "Topic Completed ✓"
                                                                : "Complete Topic"}
                                                        </button>

                                                        {!status.completed &&
                                                            !allProblemsSolved && (
                                                                <p className="practise-help-text">
                                                                    Complete all
                                                                    problems to
                                                                    finish this topic.
                                                                </p>
                                                            )}
                                                    </>
                                                )}
                                            </section>

                                            {status.completed && (
                                                <div className="practise-success">
                                                    ✓ You completed {topic.title}!
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                )}

                {isBeltComplete && (
                    <div className="practise-success practise-belt-success">
                        ✓ {belt.title} completed!
                    </div>
                )}
            </section>

            <p className="practise-demo-note">
                Demo version: your progress is saved in this browser.
            </p>
        </div>
    );
}