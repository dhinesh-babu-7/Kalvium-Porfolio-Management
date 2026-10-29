import { supabase } from "./supabase.js";

const STORAGE_KEY = "kalvium-practise-progress-v1";

// Read the existing browser progress so we can migrate it
// to Supabase without discarding older progress.
function readLocalProgress() {
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

function normalizeProgress(saved = {}) {
    return {
        learned: saved.learned === true,
        solvedProblems: Array.isArray(saved.solvedProblems)
            ? saved.solvedProblems
            : [],
        completed: saved.completed === true,
    };
}

function rowToProgress(row) {
    return {
        learned: row.learned === true,
        solvedProblems: Array.isArray(row.solved_problems)
            ? row.solved_problems
            : [],
        completed: row.completed === true,
    };
}

// Load the signed-in student's progress from Supabase.
// Migrate old local progress only for topics not yet in the database.
export async function loadPracticeProgress() {
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
        throw authError;
    }

    if (!user) {
        throw new Error(
            "No signed-in student was found. Please sign in again."
        );
    }

    const { data: rows, error } = await supabase
        .from("practise_progress")
        .select(
            "topic_id, belt_id, learned, solved_problems, completed, updated_at"
        )
        .eq("user_id", user.id);

    if (error) {
        throw error;
    }

    const progress = {};
    const databaseTopicIds = new Set();

    for (const row of rows || []) {
        progress[row.topic_id] = rowToProgress(row);
        databaseTopicIds.add(row.topic_id);
    }

    // Preserve existing browser progress when no database row exists
    // for that topic. Our topic IDs begin with b1-, b2-, etc.
    const localProgress = readLocalProgress();
    const migrationRows = [];

    for (const [topicId, saved] of Object.entries(localProgress)) {
        const match = topicId.match(/^b([1-7])-/);

        if (!match || databaseTopicIds.has(topicId)) {
            continue;
        }

        const status = normalizeProgress(saved);

        migrationRows.push({
            user_id: user.id,
            belt_id: Number(match[1]),
            topic_id: topicId,
            learned: status.learned,
            solved_problems: status.solvedProblems,
            completed: status.completed,
        });

        progress[topicId] = status;
    }

    if (migrationRows.length > 0) {
        const { error: migrationError } = await supabase
            .from("practise_progress")
            .upsert(migrationRows, {
                onConflict: "user_id,topic_id",
            });

        if (migrationError) {
            throw migrationError;
        }
    }

    return {
        userId: user.id,
        progress,
    };
}

// Save the latest state of one topic.
export async function savePracticeTopicProgress(
    userId,
    beltId,
    topicId,
    status
) {
    if (!userId) {
        throw new Error(
            "Student ID is missing. Reload the page and try again."
        );
    }

    const { error } = await supabase
        .from("practise_progress")
        .upsert(
            {
                user_id: userId,
                belt_id: beltId,
                topic_id: topicId,
                learned: status.learned === true,
                solved_problems: Array.isArray(status.solvedProblems)
                    ? status.solvedProblems
                    : [],
                completed: status.completed === true,
                updated_at: new Date().toISOString(),
            },
            {
                onConflict: "user_id,topic_id",
            }
        );

    if (error) {
        throw error;
    }
}