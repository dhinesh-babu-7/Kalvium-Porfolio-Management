import { Navigate, useParams } from "react-router-dom";

import BeltPage from "./BeltPage.jsx";
import Belt1 from "./belts/Belt1.jsx";
import Belt2 from "./belts/Belt2.jsx";
import Belt3 from "./belts/Belt3.jsx";
import Belt4 from "./belts/Belt4.jsx";
import Belt5 from "./belts/Belt5.jsx";
import Belt6 from "./belts/Belt6.jsx";
import Belt7 from "./belts/Belt7.jsx";

const STORAGE_KEY = "kalvium-practise-progress-v1";

const BELT_CONTENT = {
    1: Belt1,
    2: Belt2,
    3: Belt3,
    4: Belt4,
    5: Belt5,
    6: Belt6,
    7: Belt7,
};

function readSavedProgress() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const parsed = saved ? JSON.parse(saved) : {};

        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
            ? parsed
            : {};
    } catch {
        return {};
    }
}

function isBeltComplete(progress, belt) {
    return belt.topics.every((topic) => progress[topic.id]?.completed === true);
}

export default function BeltRoutes() {
    const { beltId } = useParams();
    const selectedBeltId = Number(beltId);

    // Redirect invalid belt URLs to the belt dashboard.
    if (
        !Number.isInteger(selectedBeltId) ||
        selectedBeltId < 1 ||
        selectedBeltId > 7
    ) {
        return (
            <Navigate
                to="/student/dashboard/practise"
                replace
            />
        );
    }

    const selectedBelt = BELT_CONTENT[selectedBeltId];
    const progress = readSavedProgress();
    const previousBelt = BELT_CONTENT[selectedBeltId - 1];
    const isLocked =
        selectedBeltId > 1 &&
        (!previousBelt || !isBeltComplete(progress, previousBelt));

    // We'll add the remaining belt content in later steps.
    if (!selectedBelt) {
        return (
            <div className="practise-page">
                <h1>Belt {selectedBeltId}</h1>

                <p>
                    This belt page is not ready yet.
                    We are building each belt separately.
                </p>

                <a href="/student/dashboard/practise">
                    ← Back to All Belts
                </a>
            </div>
        );
    }

    return <BeltPage belt={selectedBelt} locked={isLocked} />;
}