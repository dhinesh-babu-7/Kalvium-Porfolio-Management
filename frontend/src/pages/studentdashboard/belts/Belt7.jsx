const createTopic = (id, title, learningResources, practices) => ({
    id,
    title,
    resources: [
        ...learningResources.map((url, index) => ({
            title: `Learning Resource ${index + 1}: ${title}`,
            url,
        })),
        ...practices.map(({ title: practiceTitle, url }) => ({
            title: `Practice: ${practiceTitle}`,
            url,
        })),
    ],
    problems: practices.map(({ title: practiceTitle }) => practiceTitle),
});

const Belt7 = {
    id: 7,
    title: "Senior Brown Belt",
    subtitle: "Advanced Problem-Solving Strategies",
    topics: [
        createTopic(
            "b7-binary-search-answer-space",
            "Binary search on answer space: feasibility checks, minimize the maximum and maximize the minimum",
            [
                "https://www.geeksforgeeks.org/binary-search-on-answer-tutorial-with-problems/",
                "https://cp-algorithms.com/num_methods/binary_search.html",
                "https://leetcode.com/discuss/study-guide/",
            ],
            [
                {
                    title: "Koko Eating Bananas",
                    url: "https://leetcode.com/problems/koko-eating-bananas/",
                },
                {
                    title: "Capacity To Ship Packages Within D Days",
                    url: "https://leetcode.com/problems/capacity-to-ship-packages-within-d-days/",
                },
                {
                    title: "Minimum Number of Days to Make m Bouquets",
                    url: "https://leetcode.com/problems/minimum-number-of-days-to-make-m-bouquets/",
                },
                {
                    title: "Split Array Largest Sum",
                    url: "https://leetcode.com/problems/split-array-largest-sum/",
                },
                {
                    title: "Find the Smallest Divisor Given a Threshold",
                    url: "https://leetcode.com/problems/find-the-smallest-divisor-given-a-threshold/",
                },
                {
                    title: "Magnetic Force Between Two Balls",
                    url: "https://leetcode.com/problems/magnetic-force-between-two-balls/",
                },
            ],
        ),
        createTopic(
            "b7-greedy-algorithms",
            "Greedy algorithms: greedy-choice property and proving a local choice",
            [
                "https://www.geeksforgeeks.org/greedy-algorithms/",
                "https://www.programiz.com/dsa/greedy-algorithm",
                "https://cp-algorithms.com/",
            ],
            [
                {
                    title: "Assign Cookies",
                    url: "https://leetcode.com/problems/assign-cookies/",
                },
                {
                    title: "Lemonade Change",
                    url: "https://leetcode.com/problems/lemonade-change/",
                },
                {
                    title: "Maximum Units on a Truck",
                    url: "https://leetcode.com/problems/maximum-units-on-a-truck/",
                },
                {
                    title: "Can Place Flowers",
                    url: "https://leetcode.com/problems/can-place-flowers/",
                },
                {
                    title: "Jump Game",
                    url: "https://leetcode.com/problems/jump-game/",
                },
                {
                    title: "Gas Station",
                    url: "https://leetcode.com/problems/gas-station/",
                },
            ],
        ),
        createTopic(
            "b7-greedy-applications-activity-selection-interval-scheduling-job-sequencing-and-jump-game",
            "Greedy applications: activity selection, interval scheduling, job sequencing and Jump Game",
            [
                "https://www.geeksforgeeks.org/activity-selection-problem-greedy-algo-1/",
                "https://www.geeksforgeeks.org/job-sequencing-problem/",
                "https://www.geeksforgeeks.org/maximum-number-of-meetings-in-one-room/",
            ],
            [
                {
                    title: "Non-overlapping Intervals",
                    url: "https://leetcode.com/problems/non-overlapping-intervals/",
                },
                {
                    title: "Minimum Number of Arrows to Burst Balloons",
                    url: "https://leetcode.com/problems/minimum-number-of-arrows-to-burst-balloons/",
                },
                {
                    title: "Meeting Rooms",
                    url: "https://leetcode.com/problems/meeting-rooms/",
                },
                {
                    title: "Meeting Rooms II",
                    url: "https://leetcode.com/problems/meeting-rooms-ii/",
                },
                {
                    title: "Jump Game",
                    url: "https://leetcode.com/problems/jump-game/",
                },
                {
                    title: "Jump Game II",
                    url: "https://leetcode.com/problems/jump-game-ii/",
                },
            ],
        ),
        createTopic(
            "b7-when-greedy-fails-0-1-knapsack-coin-change-and-longest-increasing-subsequence",
            "When greedy fails: 0-1 Knapsack, Coin Change and Longest Increasing Subsequence",
            [
                "https://www.geeksforgeeks.org/0-1-knapsack-problem-dp-10/",
                "https://www.geeksforgeeks.org/coin-change-dp-7/",
                "https://www.geeksforgeeks.org/longest-increasing-subsequence-dp-3/",
            ],
            [
                {
                    title: "Coin Change",
                    url: "https://leetcode.com/problems/coin-change/",
                },
                {
                    title: "Coin Change II",
                    url: "https://leetcode.com/problems/coin-change-2/",
                },
                {
                    title: "Partition Equal Subset Sum",
                    url: "https://leetcode.com/problems/partition-equal-subset-sum/",
                },
                {
                    title: "Last Stone Weight II",
                    url: "https://leetcode.com/problems/last-stone-weight-ii/",
                },
                {
                    title: "Longest Increasing Subsequence",
                    url: "https://leetcode.com/problems/longest-increasing-subsequence/",
                },
                {
                    title: "Ones and Zeroes",
                    url: "https://leetcode.com/problems/ones-and-zeroes/",
                },
            ],
        ),
        createTopic(
            "b7-choosing-the-right-approach-binary-search-on-answer-space-vs-greedy-vs-dynamic-programming",
            "Choosing the right approach: binary search on answer space vs greedy vs dynamic programming",
            [
                "https://www.geeksforgeeks.org/binary-search-on-answer-tutorial-with-problems/",
                "https://www.geeksforgeeks.org/greedy-algorithms/",
                "https://www.geeksforgeeks.org/dynamic-programming/",
            ],
            [
                {
                    title: "Koko Eating Bananas",
                    url: "https://leetcode.com/problems/koko-eating-bananas/",
                },
                {
                    title: "Capacity To Ship Packages Within D Days",
                    url: "https://leetcode.com/problems/capacity-to-ship-packages-within-d-days/",
                },
                {
                    title: "Jump Game",
                    url: "https://leetcode.com/problems/jump-game/",
                },
                {
                    title: "Jump Game II",
                    url: "https://leetcode.com/problems/jump-game-ii/",
                },
                {
                    title: "Coin Change",
                    url: "https://leetcode.com/problems/coin-change/",
                },
                {
                    title: "Longest Increasing Subsequence",
                    url: "https://leetcode.com/problems/longest-increasing-subsequence/",
                },
            ],
        ),
    ],
};

export default Belt7;
