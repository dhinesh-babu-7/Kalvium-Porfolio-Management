import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./practise.css";
import { studentTabPath } from "../MentorDashboard/dashboardRoutes.js";

import {
    getTopicProblemIds,
    loadPracticeProgress,
    savePracticeTopicProgress,
} from "../../lib/practiceProgress.js";

function getTopicProgress(topicProgress, problemProgress, topic) {
    const saved = topicProgress[topic.id] || {};
    const savedProblems = problemProgress[topic.id] || {};

    return {
        learned: saved.learned === true,
        solvedProblems: Object.entries(savedProblems)
            .filter(([, solved]) => solved === true)
            .map(([problemId]) => problemId),
        completed: saved.completed === true,
    };
}

export default function BeltPage({
    belt,
    previousBelt = null,
    locked = false,
}) {
    const navigate = useNavigate();

    const [topicProgress, setTopicProgress] = useState({});
    const [problemProgress, setProblemProgress] = useState({});
    const [beltProgress, setBeltProgress] = useState({});

    const [userId, setUserId] = useState(null);
    const [progressLoading, setProgressLoading] = useState(true);
    const [progressError, setProgressError] = useState("");
    const progressRef = useRef({
        topicProgress: {},
        problemProgress: {},
        beltProgress: {},
    });
    const saveQueueRef = useRef(Promise.resolve());
    const saveRevisionRef = useRef(0);

    useEffect(() => {
        let cancelled = false;

        async function fetchProgress() {
            setProgressLoading(true);
            setProgressError("");

            try {
                const result = await loadPracticeProgress();

                if (cancelled) return;

                setUserId(result.userId);
                const nextProgress = {
                    topicProgress: result.topicProgress,
                    problemProgress: result.problemProgress,
                    beltProgress: result.beltProgress,
                };
                progressRef.current = nextProgress;
                setTopicProgress(nextProgress.topicProgress);
                setProblemProgress(nextProgress.problemProgress);
                setBeltProgress(nextProgress.beltProgress);
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

    const topicStatus = (topic) =>
        getTopicProgress(topicProgress, problemProgress, topic);

    const currentTopicStatus = (topic) =>
        getTopicProgress(
            progressRef.current.topicProgress,
            progressRef.current.problemProgress,
            topic
        );

    const updateTopicProgress = (topic, changes) => {
        const nextTopicProgress = {
            ...currentTopicStatus(topic),
            ...changes,
        };

        if (!userId) {
            setProgressError(
                "Your student account is not ready. Please reload the page."
            );
            return;
        }

        const problemIds = getTopicProblemIds(topic);
        if (
            problemIds.length !== topic.problems.length ||
            problemIds.some((problemId) => !problemId)
        ) {
            setProgressError(
                `Could not identify all problem IDs for ${topic.title}.`
            );
            return;
        }

        setProgressError("");

        const nextTopicMap = {
            ...progressRef.current.topicProgress,
            [topic.id]: {
                learned: nextTopicProgress.learned,
                completed: nextTopicProgress.completed,
            },
        };
        const nextProblemMap = {
            ...progressRef.current.problemProgress,
            [topic.id]: Object.fromEntries(
                problemIds.map((problemId) => [
                    problemId,
                    nextTopicProgress.solvedProblems.includes(problemId),
                ])
            ),
        };
        const optimisticProgress = {
            topicProgress: nextTopicMap,
            problemProgress: nextProblemMap,
            beltProgress: progressRef.current.beltProgress,
        };
        const saveRevision = saveRevisionRef.current + 1;
        saveRevisionRef.current = saveRevision;

        progressRef.current = optimisticProgress;
        setTopicProgress(nextTopicMap);
        setProblemProgress(nextProblemMap);

        saveQueueRef.current = saveQueueRef.current
            .then(async () => {
                const savedProgress = await savePracticeTopicProgress(
                    belt.id,
                    topic.id,
                    nextTopicProgress
                );
                const finalProgress = {
                    topicProgress: savedProgress.topicProgress,
                    problemProgress: savedProgress.problemProgress,
                    beltProgress: savedProgress.beltProgress,
                };
                if (saveRevision === saveRevisionRef.current) {
                    progressRef.current = finalProgress;
                    setTopicProgress(finalProgress.topicProgress);
                    setProblemProgress(finalProgress.problemProgress);
                    setBeltProgress(finalProgress.beltProgress);
                }
            })
            .catch((error) => {
                setProgressError(
                    error.message || "Could not save progress to Supabase."
                );
            });
    };

    const previousBeltSavedProgress = previousBelt
        ? beltProgress[`belt_${previousBelt.id}`]
        : null;
    const isLocked =
        locked &&
        (!previousBeltSavedProgress?.completed ||
            !previousBelt.topics.every(
                (topic) => topicStatus(topic).completed
            ));

    const isBeltComplete = belt.topics.every(
        (topic) => topicStatus(topic).completed
    );

    const completedTopics = belt.topics.filter(
        (topic) => topicStatus(topic).completed
    ).length;
    const savedBeltProgress = beltProgress[`belt_${belt.id}`] || {};
    const beltPercentage = Number.isFinite(
        savedBeltProgress.completionPercentage
    )
        ? savedBeltProgress.completionPercentage
        : (completedTopics / belt.topics.length) * 100;

    const toggleTopic = (topicId) => {
        setOpenTopics((previous) => ({
            ...previous,
            [topicId]: !previous[topicId],
        }));
    };

    const toggleProblem = (topic, problemIndex) => {
        const status = topicStatus(topic);

        if (!status.learned || status.completed) return;

        const solved = new Set(status.solvedProblems);

        const problemId = getTopicProblemIds(topic)[problemIndex];
        if (!problemId) return;

        if (solved.has(problemId)) {
            solved.delete(problemId);
        } else {
            solved.add(problemId);
        }

        updateTopicProgress(topic, {
            solvedProblems: [...solved],
        });
    };

    const completeTopic = (topic) => {
        const status = topicStatus(topic);
        const problemIds = getTopicProblemIds(topic);

        const allProblemsSolved = topic.problems.every(
            (_, index) => status.solvedProblems.includes(problemIds[index])
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
                                width: `${beltPercentage}%`,
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

                {isLocked ? (
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
                            const status = topicStatus(topic);
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
                                    status.solvedProblems.includes(
                                        getTopicProblemIds(topic)[problemIndex]
                                    )
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
                                                            disabled={
                                                                progressLoading ||
                                                                !userId
                                                            }
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
                                                        <p>
                                                            Solve each problem and
                                                            check it when finished.
                                                        </p>

                                                        <div className="practise-problem-grid">
                                                            {topic.problems.map(
                                                                (problem, problemIndex) => {
                                                                    const solved =
                                                                        status.solvedProblems.includes(
                                                                            getTopicProblemIds(topic)[problemIndex]
                                                                        );
                                                                    const practiceResource =
                                                                        practiceResources[problemIndex];

                                                                    return (
                                                                        <div
                                                                            key={`${topic.id}-${problemIndex}`}
                                                                            className={[
                                                                                "practise-problem",
                                                                                solved ? "solved" : "",
                                                                            ].join(" ")}
                                                                        >
                                                                            <label className="practise-problem-label">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={solved}
                                                                                    disabled={
                                                                                        progressLoading ||
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
                                                                                    <strong className="practise-problem-heading">
                                                                                        Problem{" "}
                                                                                        {problemIndex + 1}
                                                                                    </strong>

                                                                                    <span>
                                                                                        {problem}
                                                                                    </span>
                                                                                </span>
                                                                            </label>

                                                                            {practiceResource && (
                                                                                <a
                                                                                    className="practise-problem-action"
                                                                                    href={practiceResource.url}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                >
                                                                                    Solve ↗
                                                                                </a>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                }
                                                            )}
                                                        </div>

                                                        <button
                                                            type="button"
                                                            className="practise-primary-button"
                                                            disabled={
                                                                progressLoading ||
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
                Your progress is saved to your student account.
            </p>
        </div>
    );
}