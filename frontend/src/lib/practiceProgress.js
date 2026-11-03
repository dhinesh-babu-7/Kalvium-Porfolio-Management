import { supabase } from "./supabase.js";

const STORAGE_KEY = "kalvium-practise-progress-v1";

export const BELT_TOPIC_TOTALS = {
    1: 5,
    2: 5,
    3: 3,
    4: 6,
    5: 7,
    6: 6,
    7: 5,
};

function asObject(value) {
    return value &&
        typeof value === "object" &&
        !Array.isArray(value)
        ? value
        : {};
}

function normalizeProgressMap(value) {
    return asObject(value);
}

function readLegacyProgress() {
    try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        const parsed = saved ? JSON.parse(saved) : {};

        return asObject(parsed);
    } catch (error) {
        throw new Error(
            "Could not read the old practice progress for migration.",
            { cause: error }
        );
    }
}

async function getCurrentUser() {
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error) throw error;
    if (!user) {
        throw new Error(
            "No signed-in student was found. Please sign in again."
        );
    }

    return user;
}

async function loadProgressRow(userId) {
    const { data, error } = await supabase
        .from("practise_progress")
        .select("belt_progress, topic_progress, problem_progress")
        .eq("user_id", userId)
        .maybeSingle();

    if (error) throw error;

    return data
        ? {
            beltProgress: normalizeProgressMap(data.belt_progress),
            topicProgress: normalizeProgressMap(data.topic_progress),
            problemProgress: normalizeProgressMap(data.problem_progress),
        }
        : {
            beltProgress: {},
            topicProgress: {},
            problemProgress: {},
        };
}

function hasSavedDatabaseProgress(progress) {
    return Object.keys(progress.beltProgress).length > 0 ||
        Object.keys(progress.topicProgress).length > 0 ||
        Object.keys(progress.problemProgress).length > 0;
}

async function migrateLegacyProgressIfNeeded(progress) {
    const legacyProgress = readLegacyProgress();

    if (
        Object.keys(legacyProgress).length === 0 ||
        hasSavedDatabaseProgress(progress)
    ) {
        return false;
    }

    const { error } = await supabase.rpc("merge_legacy_practice_progress", {
        p_progress: legacyProgress,
    });

    if (error) throw error;

    // Keep the key until the database-backed flow has been verified.
    return true;
}

export async function loadPracticeProgress() {
    const user = await getCurrentUser();
    let progress = await loadProgressRow(user.id);
    const migrated = await migrateLegacyProgressIfNeeded(progress);

    if (migrated) {
        progress = await loadProgressRow(user.id);
    }

    return {
        userId: user.id,
        ...progress,
    };
}

export async function savePracticeTopicProgress(beltId, topicId, status) {
    const { data, error } = await supabase.rpc(
        "save_practice_topic_progress",
        {
            p_belt_id: beltId,
            p_topic_id: topicId,
            p_learned: status.learned === true,
            p_solved_problems: Array.isArray(status.solvedProblems)
                ? status.solvedProblems
                : [],
            p_completed: status.completed === true,
        }
    );

    if (error) throw error;

    return {
        beltProgress: normalizeProgressMap(data?.beltProgress),
        topicProgress: normalizeProgressMap(data?.topicProgress),
        problemProgress: normalizeProgressMap(data?.problemProgress),
    };
}

export function getTopicProblemIds(topic) {
    return topic.resources
        .filter((resource) => resource.title.startsWith("Practice"))
        .map((resource) => {
            const match = resource.url.match(/\/problems\/([^/?#]+)/);
            return match?.[1] || null;
        });
}

export { STORAGE_KEY };
