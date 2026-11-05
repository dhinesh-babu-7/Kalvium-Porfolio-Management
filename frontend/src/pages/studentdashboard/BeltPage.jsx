import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./practise.css";
import { studentTabPath } from "../MentorDashboard/dashboardRoutes.js";

import {
    getTopicProblemIds,
    loadPracticeProgress,
    savePracticeTopicProgress,
} from "../../lib/practiceProgress.js";
import {
    getStudentPracticeTopicReviews,
    submitPracticeTopicForReview,
} from "../../api/routes/StudentDashboard/practiceTopicReviews.js";

const PRACTICE_SUBMISSION_FORM_URL =
    "https://docs.google.com/forms/d/e/1FAIpQLSfgwEYtQIB3u4A2IhhUTPGuEshXdV5NhphDbWt6HBn7y5eWMA/viewform";
const BELT_NAMES = [
    "Yellow Belt",
    "Orange Belt",
    "Green Belt",
    "Purple Belt",
    "Blue Belt",
    "Brown Belt",
    "Senior Brown Belt",
];

function getTopicProgress(topicProgress, problemProgress, topic, review) {
    const saved = topicProgress[topic.id] || {};
    const savedProblems = problemProgress[topic.id] || {};
    const reviewStatus = review?.status || (saved.completed === true ? "approved" : null);

    return {
        learned: saved.learned === true,
        solvedProblems: Object.entries(savedProblems)
            .filter(([, solved]) => solved === true)
            .map(([problemId]) => problemId),
        completed: reviewStatus === "approved" || saved.completed === true,
        reviewStatus,
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
    const [reviewRequests, setReviewRequests] = useState([]);
    const [beltLevels, setBeltLevels] = useState({});
    const [beltLevelsUpdatedAt, setBeltLevelsUpdatedAt] = useState(null);

    const [userId, setUserId] = useState(null);
    const [progressLoading, setProgressLoading] = useState(true);
    const [progressError, setProgressError] = useState("");
    const [reviewError, setReviewError] = useState("");
    const [submittingTopicId, setSubmittingTopicId] = useState(null);
    const progressRef = useRef({
        topicProgress: {},
        problemProgress: {},
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
                };
                progressRef.current = nextProgress;
                setTopicProgress(nextProgress.topicProgress);
                setProblemProgress(nextProgress.problemProgress);
                setBeltLevels(result.finalBeltLevels || {});
                setBeltLevelsUpdatedAt(result.finalBeltLevelsUpdatedAt || null);

                try {
                    setReviewRequests(await getStudentPracticeTopicReviews());
                } catch (error) {
                    if (!cancelled) {
                        setReviewError(
                            error.response?.data?.error ||
                            error.message ||
                            "Could not load topic review status."
                        );
                    }
                }
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

    useEffect(() => {
        let cancelled = false;
        const refreshReviews = async () => {
            try {
                const reviews = await getStudentPracticeTopicReviews();
                if (!cancelled) {
                    setReviewRequests(reviews);
                    setReviewError("");
                }
            } catch (error) {
                if (!cancelled) {
                    setReviewError(
                        error.response?.data?.error ||
                        error.message ||
                        "Could not refresh topic review status."
                    );
                }
            }
        };
        const intervalId = window.setInterval(refreshReviews, 30000);
        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
        };
    }, []);

    const [openTopics, setOpenTopics] = useState(() => ({
        [belt.topics[0]?.id]: true,
    }));

    const getReviewForTopic = (topic) => {
        const matchingReviews = reviewRequests.filter(
            (review) => review.belt_id === belt.id && review.topic_id === topic.id
        );
        return matchingReviews.sort((left, right) => {
            const statusRank = { approved: 3, pending: 2, rejected: 1 };
            const rankDifference =
                (statusRank[right.status] || 0) - (statusRank[left.status] || 0);
            if (rankDifference !== 0) return rankDifference;
            return Date.parse(right.reviewed_at || right.created_at || "") -
                Date.parse(left.reviewed_at || left.created_at || "");
        })[0];
    };

    const topicStatus = (topic) =>
        getTopicProgress(
            topicProgress,
            problemProgress,
            topic,
            getReviewForTopic(topic)
        );

    const currentTopicStatus = (topic) =>
        getTopicProgress(
            progressRef.current.topicProgress,
            progressRef.current.problemProgress,
            topic,
            getReviewForTopic(topic)
        );

    const topicIsUnlocked = (topic) => {
        const topicIndex = belt.topics.findIndex((item) => item.id === topic.id);
        return topicIndex <= 0 || topicStatus(belt.topics[topicIndex - 1]).completed;
    };

    const updateTopicProgress = (topic, changes) => {
        const status = currentTopicStatus(topic);
        if (
            !topicIsUnlocked(topic) ||
            status.completed ||
            status.reviewStatus === "pending"
        ) {
            return;
        }

        const nextTopicProgress = {
            ...status,
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
                const savedProblemGroup =
                    savedProgress.problemProgress[topic.id] || {};
                const savedStateMatchesRequest = problemIds.every(
                    (problemId) =>
                        savedProblemGroup[problemId] ===
                        nextTopicProgress.solvedProblems.includes(problemId)
                );

                if (!savedStateMatchesRequest) {
                    throw new Error(
                        "Practice progress was not accepted by the database. " +
                        "Run the document syllabus update SQL in Supabase, then try again."
                    );
                }

                const finalProgress = {
                    topicProgress: savedProgress.topicProgress,
                    problemProgress: savedProgress.problemProgress,
                };
                if (saveRevision === saveRevisionRef.current) {
                    progressRef.current = finalProgress;
                    setTopicProgress(finalProgress.topicProgress);
                    setProblemProgress(finalProgress.problemProgress);
                }
            })
            .catch((error) => {
                setProgressError(
                    error.message || "Could not save progress to Supabase."
                );
            });
    };

    const isBeltComplete = belt.topics.every(
        (topic) => topicStatus(topic).completed
    );

    const completedTopics = belt.topics.filter(
        (topic) => topicStatus(topic).completed
    ).length;
    const beltPercentage = (completedTopics / belt.topics.length) * 100;
    const assessedBeltLevel = Object.values(beltLevels)
        .map(Number)
        .filter((level) => Number.isInteger(level) && level >= 1 && level <= BELT_NAMES.length)
        .reduce((highest, level) => Math.max(highest, level), 0);
    const isAssessedBelt = assessedBeltLevel >= belt.id;
    const isLocked =
        locked &&
        !isAssessedBelt &&
        (!previousBelt ||
            !previousBelt.topics.every(
                (topic) => topicStatus(topic).completed
            ));

    const toggleTopic = (topicId) => {
        setOpenTopics((previous) => ({
            ...previous,
            [topicId]: !previous[topicId],
        }));
    };

    const toggleProblem = (topic, problemIndex, checked) => {
        const status = currentTopicStatus(topic);

        if (
            !topicIsUnlocked(topic) ||
            !status.learned ||
            status.completed ||
            status.reviewStatus === "pending"
        ) return;

        const solved = new Set(status.solvedProblems);

        const problemId = getTopicProblemIds(topic)[problemIndex];
        if (!problemId) return;

        if (checked) {
            solved.add(problemId);
        } else {
            solved.delete(problemId);
        }

        updateTopicProgress(topic, {
            solvedProblems: [...solved],
        });
    };

    const completeTopic = async (topic) => {
        const status = topicStatus(topic);
        const problemIds = getTopicProblemIds(topic);

        const allProblemsSolved = topic.problems.every(
            (_, index) => status.solvedProblems.includes(problemIds[index])
        );

        if (
            !topicIsUnlocked(topic) ||
            !status.learned ||
            status.completed ||
            status.reviewStatus === "pending" ||
            !allProblemsSolved
        ) return;

        setSubmittingTopicId(topic.id);
        setProgressError("");
        try {
            await saveQueueRef.current;
            const review = await submitPracticeTopicForReview(belt.id, topic.id);
            if (!review) {
                throw new Error("The topic review request was not returned by the server.");
            }
            setReviewRequests((current) => [
                review,
                ...current.filter(
                    (item) => !(item.belt_id === belt.id && item.topic_id === topic.id && item.status === "pending")
                ),
            ]);
        } catch (error) {
            setProgressError(
                error.response?.data?.error ||
                error.message ||
                "Could not submit this topic for mentor review."
            );
        } finally {
            setSubmittingTopicId(null);
        }
    };

    return (
        <div className="practise-page">
            <section className="assessed-belt-levels" aria-label="Assessed belt levels">
                <div>
                    <span className="assessed-belt-eyebrow">MENTOR ASSESSMENT</span>
                    <h2>{assessedBeltLevel ? BELT_NAMES[assessedBeltLevel - 1] : "Assessed belt levels"}</h2>
                    <p>
                        {beltLevelsUpdatedAt
                            ? `Last updated ${new Date(beltLevelsUpdatedAt).toLocaleDateString()}`
                            : "Your mentor has not uploaded assessed levels yet."}
                    </p>
                </div>
                <div className="assessed-belt-level-list">
                    {Object.entries(beltLevels).length ? Object.entries(beltLevels).map(([language, level]) => (
                        <span key={language}>
                            <strong>{language.toUpperCase()}</strong>
                            <b>Level {String(level)}</b>
                        </span>
                    )) : <span>No assessed levels available</span>}
                </div>
            </section>
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
            {reviewError && (
                <p className="practise-help-text" role="alert">
                    {reviewError}
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
                            const review = getReviewForTopic(topic);
                            const topicLocked = !topicIsUnlocked(topic);
                            const expanded = Boolean(openTopics[topic.id]);

                            const learningResources = topic.resources.filter(
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
                                                    ? "Mentor approved ✓"
                                                    : status.reviewStatus === "pending"
                                                        ? "Waiting for mentor review"
                                                        : status.reviewStatus === "rejected"
                                                            ? "Mentor requested changes"
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
                                            {topicLocked && (
                                                <div className="practise-locked-message">
                                                    <strong>This topic is locked.</strong>
                                                    <span>
                                                        Your mentor must approve{" "}
                                                        {belt.topics[index - 1]?.title || "the previous topic"} before you can continue.
                                                    </span>
                                                </div>
                                            )}

                                            {status.reviewStatus === "pending" && (
                                                <div className="practise-locked-message">
                                                    Your submission is waiting for mentor review. You can continue after it is approved.
                                                </div>
                                            )}

                                            {status.reviewStatus === "rejected" && review?.mentor_note && (
                                                <div className="practise-locked-message">
                                                    <strong>Mentor feedback</strong>
                                                    <span>{review.mentor_note}</span>
                                                </div>
                                            )}

                                            <section className="practise-resource-section">
                                                <h3>1. Learning Resources</h3>

                                                <p>
                                                    Study the learning material for{" "}
                                                    {topic.title} before starting
                                                    the exercises.
                                                </p>

                                                {learningResources.map((resource) => (
                                                    <a
                                                        key={resource.url}
                                                        className="practise-resource-link"
                                                        href={resource.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <span className="practise-resource-title">
                                                            📘 {resource.title}
                                                        </span>

                                                        <span className="practise-resource-action">
                                                            Open learning resource ↗
                                                        </span>
                                                    </a>
                                                ))}

                                                {!status.learned &&
                                                    !status.completed && (
                                                        <button
                                                            type="button"
                                                            className="practise-primary-button"
                                                            disabled={
                                                                progressLoading ||
                                                                topicLocked ||
                                                                status.reviewStatus === "pending" ||
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
                                                                                        status.completed ||
                                                                                        topicLocked ||
                                                                                        status.reviewStatus === "pending"
                                                                                    }
                                                                                    onChange={(event) =>
                                                                                        toggleProblem(
                                                                                            topic,
                                                                                            problemIndex,
                                                                                            event.target.checked
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

                                                                            <span className="practise-problem-actions">
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

                                                                                <a
                                                                                    className="practise-problem-action practise-submission-action"
                                                                                    href={PRACTICE_SUBMISSION_FORM_URL}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                >
                                                                                    Submit ↗
                                                                                </a>
                                                                            </span>
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
                                                                topicLocked ||
                                                                status.completed ||
                                                                status.reviewStatus === "pending" ||
                                                                submittingTopicId === topic.id ||
                                                                !allProblemsSolved
                                                            }
                                                            onClick={() =>
                                                                completeTopic(topic)
                                                            }
                                                        >
                                                            {status.completed
                                                                ? "Mentor Approved ✓"
                                                                : status.reviewStatus === "pending"
                                                                    ? "Waiting for Mentor Review"
                                                                    : submittingTopicId === topic.id
                                                                        ? "Submitting..."
                                                                        : status.reviewStatus === "rejected"
                                                                            ? "Resubmit for Mentor Review"
                                                                            : "Submit for Mentor Review"}
                                                        </button>

                                                        {!status.completed &&
                                                            status.reviewStatus !== "pending" &&
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
                                                    ✓ Your mentor approved {topic.title}.
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