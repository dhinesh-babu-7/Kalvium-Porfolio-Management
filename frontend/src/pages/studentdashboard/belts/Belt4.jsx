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

const Belt4 = {
    id: 4,
    title: "Belt 4",
    subtitle: "Algorithms and Optimization",
    topics: [
        createTopic(
            "b4-kadanes-algorithm",
            "Kadane's Algorithm",
            "https://www.geeksforgeeks.org/largest-sum-contiguous-subarray/",
            leetCodePractice([
                ["Maximum Subarray", "maximum-subarray"],
                ["Maximum Product Subarray", "maximum-product-subarray"],
                ["Maximum Sum Circular Subarray", "maximum-sum-circular-subarray"],
                ["Best Time to Buy and Sell Stock", "best-time-to-buy-and-sell-stock"],
                ["K-Concatenation Maximum Sum", "k-concatenation-maximum-sum"],
                ["Maximum Absolute Sum of Any Subarray", "maximum-absolute-sum-of-any-subarray"],
            ])
        ),
        createTopic(
            "b4-dutch-national-flag",
            "Dutch National Flag / Three-Way Partitioning",
            "https://www.geeksforgeeks.org/dutch-national-flag-algorithm/",
            leetCodePractice([
                ["Sort Colors", "sort-colors"],
                ["Sort an Array", "sort-an-array"],
                ["Move Zeroes", "move-zeroes"],
                ["Partition Array According to Given Pivot", "partition-array-according-to-given-pivot"],
                ["Wiggle Sort II", "wiggle-sort-ii"],
                ["Sort Array By Parity", "sort-array-by-parity"],
            ])
        ),
        createTopic(
            "b4-moores-voting",
            "Moore's Voting / Majority Element",
            "https://www.geeksforgeeks.org/boyer-moore-majority-voting-algorithm/",
            leetCodePractice([
                ["Majority Element", "majority-element"],
                ["Majority Element II", "majority-element-ii"],
                [
                    "Check If a Number Is Majority Element in a Sorted Array",
                    "check-if-a-number-is-majority-element-in-a-sorted-array",
                ],
                ["Online Majority Element In Subarray", "online-majority-element-in-subarray"],
                ["Find All Duplicates in an Array", "find-all-duplicates-in-an-array"],
                ["Repeated Element in Sorted Array", "repeated-element-in-sorted-array"],
            ])
        ),
        createTopic(
            "b4-basic-sorting",
            "Sorting: Selection, Bubble and Insertion Sort",
            "https://www.programiz.com/dsa/sorting-algorithm",
            leetCodePractice([
                ["Sort an Array", "sort-an-array"],
                ["Sort Colors", "sort-colors"],
                ["Merge Sorted Array", "merge-sorted-array"],
                ["Relative Sort Array", "relative-sort-array"],
                ["Height Checker", "height-checker"],
                ["Largest Number", "largest-number"],
            ])
        ),
        createTopic(
            "b4-merge-quick-sort",
            "Merge Sort and Quick Sort",
            "https://www.programiz.com/dsa/merge-sort",
            leetCodePractice([
                ["Sort an Array", "sort-an-array"],
                ["Merge Sorted Array", "merge-sorted-array"],
                ["Sort List", "sort-list"],
                ["Kth Largest Element in an Array", "kth-largest-element-in-an-array"],
                ["Sort an Array By Parity", "sort-array-by-parity"],
                ["Largest Number", "largest-number"],
            ])
        ),
        createTopic(
            "b4-sliding-window",
            "Sliding Window",
            "https://www.geeksforgeeks.org/window-sliding-technique/",
            leetCodePractice([
                ["Maximum Average Subarray I", "maximum-average-subarray-i"],
                ["Minimum Size Subarray Sum", "minimum-size-subarray-sum"],
                [
                    "Longest Substring Without Repeating Characters",
                    "longest-substring-without-repeating-characters",
                ],
                ["Permutation in String", "permutation-in-string"],
                ["Longest Repeating Character Replacement", "longest-repeating-character-replacement"],
                ["Max Consecutive Ones III", "max-consecutive-ones-iii"],
            ])
        ),
    ],
};

export default Belt4;
