import React, { useEffect, useState } from "react";
import { Clock, CheckCircle, AlertTriangle } from "lucide-react";
import {
    getMentorReviewQueue,
    approveMentorReview,
    rejectMentorReview,
} from "../../api/routes/Mentor/review";
import "./MentorReview.css";

const MentorReview = () => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const loadReviews = async () => {
            try {
                setLoading(true);

                const data = await getMentorReviewQueue();

                setReviews(data.reviews || []);
            } catch (err) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        loadReviews();
    }, []);


    const handleApprove = async (student) => {
        try {
            await approveMentorReview(student.student_user_id);

            // Remove the student from the pending queue
            setReviews((prev) =>
                prev.filter(
                    (item) =>
                        item.student_user_id !== student.student_user_id
                )
            );
        } catch (err) {
            console.error("Approve error:", err);
            setError(err.message || "Failed to approve review");
        }
    };

    const handleReject = async (student) => {
        try {
            await rejectMentorReview(student.student_user_id);

            // Remove the student from the pending queue
            setReviews((prev) =>
                prev.filter(
                    (item) =>
                        item.student_user_id !== student.student_user_id
                )
            );
        } catch (err) {
            console.error("Reject error:", err);
            setError(err.message || "Failed to reject review");
        }
    };

    if (loading) {
        return (
            <div className="mentor-review-page">
                <h1>Mentor Review</h1>
                <p>Loading review queue...</p>
            </div>
        );
    }

    return (
        <div className="mentor-review-page">

            <div className="review-header">
                <div>
                    <h1>Mentor Review</h1>

                    <p>
                        Review suspicious rapid LeetCode solves
                        before awarding leaderboard points.
                    </p>
                </div>

                <div className="review-count">
                    <Clock size={18} />
                    {reviews.length} Pending
                </div>
            </div>

            {error && (
                <div className="review-error">
                    <AlertTriangle size={18} />
                    {error}
                </div>
            )}

            {reviews.length === 0 ? (
                <div className="empty-review">
                    <CheckCircle size={45} />

                    <h2>No reviews pending</h2>

                    <p>
                        All assigned students are currently clear.
                    </p>
                </div>
            ) : (
                <div className="review-list">

                    {reviews.map((student) => (
                        <div
                            className="review-card"
                            key={student.student_user_id}
                        >

                            <div className="review-student">

                                <div className="review-avatar">
                                    {student.name
                                        ? student.name.charAt(0).toUpperCase()
                                        : "S"}
                                </div>

                                <div>
                                    <h3>
                                        {student.name || "Student"}
                                    </h3>

                                    <p>
                                        @{student.leetcode_username || "unknown"}
                                    </p>

                                    <span>
                                        {student.squad_id
                                            ? `Squad ${student.squad_id}`
                                            : `Student ID: ${student.student_user_id}`}
                                    </span>
                                </div>

                            </div>

                            <div className="review-warning">
                                <AlertTriangle size={18} />

                                <div>
                                    <strong>
                                        Mentor verification required
                                    </strong>

                                    <p>
                                        {student.pending_review_count} submission(s)
                                        require mentor verification.
                                    </p>

                                    {student.pending_submissions?.map(
                                        (submission) => (
                                            <div
                                                key={submission.submission_id}
                                                className="review-reason"
                                            >
                                                <strong>
                                                    {submission.title_slug}
                                                </strong>

                                                <span>
                                                    {submission.flag_reason}
                                                </span>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>

                            <div className="review-stats">

                                <div>
                                    <strong>
                                        {student.easy_solved}
                                    </strong>
                                    <span>Easy</span>
                                </div>

                                <div>
                                    <strong>
                                        {student.medium_solved}
                                    </strong>
                                    <span>Medium</span>
                                </div>

                                <div>
                                    <strong>
                                        {student.hard_solved}
                                    </strong>
                                    <span>Hard</span>
                                </div>

                                <div>
                                    <strong>
                                        {student.score}
                                    </strong>
                                    <span>Points</span>
                                </div>

                            </div>

                            <div className="review-actions">

                                <button
                                    className="review-btn approve"
                                    onClick={() => handleApprove(student)}
                                >
                                    <CheckCircle size={16} />
                                    Approve
                                </button>

                                <button
                                    className="review-btn reject"
                                    onClick={() => handleReject(student)}
                                >
                                    Reject
                                </button>

                            </div>

                        </div>
                    ))}

                </div>
            )}

        </div>
    );
};

export default MentorReview;