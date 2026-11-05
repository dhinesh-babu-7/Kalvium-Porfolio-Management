import { supabase } from "./supabase.js";

export const BELT_TOPIC_TOTALS = {
    1: 7,
    2: 6,
    3: 6,
    4: 9,
    5: 8,
    6: 7,
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
    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            return asObject(parsed);
        } catch {
            return {};
        }
    }
    return asObject(value);
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
    let { data, error } = await supabase
        .from("practise_progress")
        .select("belt_progress, topic_progress, problem_progress, final_belt_levels, final_belt_levels_updated_at")
        .eq("user_id", userId)
        .maybeSingle();

    if (error && (
        error.code === "42703" ||
        error.code === "PGRST204" ||
        String(error.message || "").includes("final_belt_levels")
    )) {
        const fallback = await supabase
            .from("practise_progress")
            .select("belt_progress, topic_progress, problem_progress")
            .eq("user_id", userId)
            .maybeSingle();
        data = fallback.data;
        error = fallback.error;
    }

    if (error) throw error;

    return data
        ? {
            beltProgress: normalizeProgressMap(data.belt_progress),
            topicProgress: normalizeProgressMap(data.topic_progress),
            problemProgress: normalizeProgressMap(data.problem_progress),
            finalBeltLevels: normalizeProgressMap(data.final_belt_levels),
            finalBeltLevelsUpdatedAt: data.final_belt_levels_updated_at || null,
        }
        : {
            beltProgress: {},
            topicProgress: {},
            problemProgress: {},
            finalBeltLevels: {},
            finalBeltLevelsUpdatedAt: null,
        };
}

export async function loadPracticeProgress() {
    const user = await getCurrentUser();
    const progress = await loadProgressRow(user.id);

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
