const createTopic = (id, title, learningUrl, practices) => ({
    id,
    title,
    resources: [
        {
            title: `Learning Resource: ${title}`,
            url: learningUrl,
        },
        ...practices.map(({ title: practiceTitle, url }) => ({
            title: `Practice: ${practiceTitle}`,
            url,
        })),
    ],
    problems: practices.map(({ title: practiceTitle }) => practiceTitle),
});

const leetCodePractice = (entries) =>
    entries.map(([title, slug]) => ({
        title,
        url: `https://leetcode.com/problems/${slug}/`,
    }));

const BINARY_SEARCH_RESOURCE =
    "https://www.geeksforgeeks.org/dsa/binary-search/";

const GREEDY_RESOURCE =
    "https://www.geeksforgeeks.org/dsa/greedy-algorithms/";

const Belt7 = {
    id: 7,
    title: "Belt 7",
    subtitle: "Binary Search and Greedy Algorithms",
    topics: [
        createTopic(
            "b7-binary-search",
            "Binary Search Fundamentals",
            BINARY_SEARCH_RESOURCE,
            leetCodePractice([
                ["Binary Search", "binary-search"],
                ["Search Insert Position", "search-insert-position"],
                ["Sqrt(x)", "sqrtx"],
                ["Guess Number Higher or Lower", "guess-number-higher-or-lower"],
                ["Valid Perfect Square", "valid-perfect-square"],
                ["Arranging Coins", "arranging-coins"],
            ])
        ),
        createTopic(
            "b7-first-last-position",
            "First/Last Position, Lower/Upper Bound",
            BINARY_SEARCH_RESOURCE,
            leetCodePractice([
                ["Find First and Last Position of Element in Sorted Array", "find-first-and-last-position-of-element-in-sorted-array"],
                ["Search Insert Position", "search-insert-position"],
                ["Find Smallest Letter Greater Than Target", "find-smallest-letter-greater-than-target"],
                ["Find Peak Element", "find-peak-element"],
                ["Search in Rotated Sorted Array", "search-in-rotated-sorted-array"],
                ["Find Minimum in Rotated Sorted Array", "find-minimum-in-rotated-sorted-array"],
            ])
        ),
        createTopic(
            "b7-binary-search-answer-space",
            "Binary Search on Answer Space",
            BINARY_SEARCH_RESOURCE,
            leetCodePractice([
                ["Koko Eating Bananas", "koko-eating-bananas"],
                ["Capacity To Ship Packages Within D Days", "capacity-to-ship-packages-within-d-days"],
                ["Minimum Number of Days to Make m Bouquets", "minimum-number-of-days-to-make-m-bouquets"],
                ["Split Array Largest Sum", "split-array-largest-sum"],
                ["Find the Smallest Divisor Given a Threshold", "find-the-smallest-divisor-given-a-threshold"],
                ["Magnetic Force Between Two Balls", "magnetic-force-between-two-balls"],
            ])
        ),
        createTopic(
            "b7-greedy-algorithms",
            "Greedy Algorithm Fundamentals",
            GREEDY_RESOURCE,
            leetCodePractice([
                ["Assign Cookies", "assign-cookies"],
                ["Lemonade Change", "lemonade-change"],
                ["Best Time to Buy and Sell Stock II", "best-time-to-buy-and-sell-stock-ii"],
                ["Jump Game", "jump-game"],
                ["Partition Labels", "partition-labels"],
                ["Gas Station", "gas-station"],
            ])
        ),
        createTopic(
            "b7-feasibility-optimization",
            "Feasibility Checks and Optimization",
            GREEDY_RESOURCE,
            leetCodePractice([
                ["Jump Game", "jump-game"],
                ["Jump Game II", "jump-game-ii"],
                ["Can Place Flowers", "can-place-flowers"],
                ["Minimum Number of Arrows to Burst Balloons", "minimum-number-of-arrows-to-burst-balloons"],
                ["Non-overlapping Intervals", "non-overlapping-intervals"],
                ["Task Scheduler", "task-scheduler"],
            ])
        ),
    ],
};

export default Belt7;
