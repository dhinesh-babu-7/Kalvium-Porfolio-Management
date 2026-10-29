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

const RECURSION_RESOURCE =
    "https://www.programiz.com/python-programming/recursion";

const BACKTRACKING_RESOURCE =
    "https://www.geeksforgeeks.org/dsa/backtracking-algorithms/";

const Belt6 = {
    id: 6,
    title: "Belt 6",
    subtitle: "Recursion and Backtracking",
    topics: [
        createTopic(
            "b6-recursion-fundamentals",
            "Recursion Fundamentals and Base/Recursive Cases",
            RECURSION_RESOURCE,
            leetCodePractice([
                ["Fibonacci Number", "fibonacci-number"],
                ["Pow(x, n)", "powx-n"],
                ["Reverse String", "reverse-string"],
                ["Swap Nodes in Pairs", "swap-nodes-in-pairs"],
                ["Merge Two Sorted Lists", "merge-two-sorted-lists"],
                ["Climbing Stairs", "climbing-stairs"],
            ])
        ),
        createTopic(
            "b6-recursion-tree-stack-depth",
            "Recursion Tree Intuition and Stack Depth",
            BACKTRACKING_RESOURCE,
            leetCodePractice([
                ["Fibonacci Number", "fibonacci-number"],
                ["Climbing Stairs", "climbing-stairs"],
                ["Pow(x, n)", "powx-n"],
                ["Maximum Depth of Binary Tree", "maximum-depth-of-binary-tree"],
                ["K-th Symbol in Grammar", "k-th-symbol-in-grammar"],
                ["Different Ways to Add Parentheses", "different-ways-to-add-parentheses"],
            ])
        ),
        createTopic(
            "b6-backtracking-fundamentals",
            "Backtracking Fundamentals",
            BACKTRACKING_RESOURCE,
            leetCodePractice([
                ["Subsets", "subsets"],
                ["Permutations", "permutations"],
                ["Combination Sum", "combination-sum"],
                ["Generate Parentheses", "generate-parentheses"],
                ["Letter Combinations of a Phone Number", "letter-combinations-of-a-phone-number"],
                ["Word Search", "word-search"],
            ])
        ),
        createTopic(
            "b6-subsets-subsequences-power-set",
            "Subsets, Subsequences and Power Set",
            "https://www.geeksforgeeks.org/dsa/find-all-subsets-of-a-given-set/",
            leetCodePractice([
                ["Subsets", "subsets"],
                ["Subsets II", "subsets-ii"],
                ["Is Subsequence", "is-subsequence"],
                ["Increasing Subsequences", "increasing-subsequences"],
                ["Non-decreasing Subsequences", "non-decreasing-subsequences"],
                [
                    "Number of Subsequences That Satisfy the Given Sum Condition",
                    "number-of-subsequences-that-satisfy-the-given-sum-condition",
                ],
            ])
        ),
        createTopic(
            "b6-permutations-duplicate-handling",
            "Permutations and Duplicate Handling",
            "https://www.geeksforgeeks.org/dsa/write-a-program-to-print-all-permutations-of-a-given-string/",
            leetCodePractice([
                ["Permutations", "permutations"],
                ["Permutations II", "permutations-ii"],
                ["Next Permutation", "next-permutation"],
                ["Letter Case Permutation", "letter-case-permutation"],
                ["Palindrome Permutation", "palindrome-permutation"],
                ["Beautiful Arrangement", "beautiful-arrangement"],
            ])
        ),
        createTopic(
            "b6-recursion-combination",
            "Recursion Depth, Stack Limits and Combination",
            RECURSION_RESOURCE,
            leetCodePractice([
                ["Combination Sum", "combination-sum"],
                ["Combination Sum II", "combination-sum-ii"],
                ["Combinations", "combinations"],
                ["N-Queens", "n-queens"],
                ["Sudoku Solver", "sudoku-solver"],
                ["Palindrome Partitioning", "palindrome-partitioning"],
            ])
        ),
    ],
};

export default Belt6;
