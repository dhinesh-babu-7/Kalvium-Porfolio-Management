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

const Belt6 = {
    id: 6,
    title: "Brown Belt",
    subtitle: "Recursion, Divide and Conquer and Backtracking",
    topics: [
        createTopic(
            "b6-recursion-fundamentals",
            "Recursion: base case, recursive case, call stack and depth limit",
            [
                "https://www.programiz.com/cpp-programming/recursion",
                "https://www.geeksforgeeks.org/introduction-to-recursion-data-structure-and-algorithm-tutorials/",
                "https://docs.python.org/3/reference/expressions.html#evaluation-order",
            ],
            [
                {
                    title: "Fibonacci Number",
                    url: "https://leetcode.com/problems/fibonacci-number/",
                },
                {
                    title: "Pow(x, n)",
                    url: "https://leetcode.com/problems/powx-n/",
                },
                {
                    title: "Climbing Stairs",
                    url: "https://leetcode.com/problems/climbing-stairs/",
                },
                {
                    title: "Reverse String",
                    url: "https://leetcode.com/problems/reverse-string/",
                },
                {
                    title: "Swap Nodes in Pairs",
                    url: "https://leetcode.com/problems/swap-nodes-in-pairs/",
                },
                {
                    title: "K-th Symbol in Grammar",
                    url: "https://leetcode.com/problems/k-th-symbol-in-grammar/",
                },
            ],
        ),
        createTopic(
            "b6-recursion-tree-stack-depth",
            "Recursion trees and core problems: factorial, Fibonacci, power, digit sum and reversal",
            [
                "https://www.geeksforgeeks.org/recursion-tree-method-for-solving-recurrences/",
                "https://www.programiz.com/python-programming/recursion",
                "https://www.geeksforgeeks.org/recursive-programming/",
            ],
            [
                {
                    title: "Fibonacci Number",
                    url: "https://leetcode.com/problems/fibonacci-number/",
                },
                {
                    title: "Pow(x, n)",
                    url: "https://leetcode.com/problems/powx-n/",
                },
                {
                    title: "Add Digits",
                    url: "https://leetcode.com/problems/add-digits/",
                },
                {
                    title: "Reverse Integer",
                    url: "https://leetcode.com/problems/reverse-integer/",
                },
                {
                    title: "Climbing Stairs",
                    url: "https://leetcode.com/problems/climbing-stairs/",
                },
                {
                    title: "Different Ways to Add Parentheses",
                    url: "https://leetcode.com/problems/different-ways-to-add-parentheses/",
                },
            ],
        ),
        createTopic(
            "b6-divide-and-conquer-merge-sort-quick-sort-and-quickselect",
            "Divide and conquer: Merge Sort, Quick Sort and Quickselect",
            [
                "https://www.programiz.com/dsa/merge-sort",
                "https://www.programiz.com/dsa/quick-sort",
                "https://www.geeksforgeeks.org/quickselect-algorithm/",
            ],
            [
                {
                    title: "Sort an Array",
                    url: "https://leetcode.com/problems/sort-an-array/",
                },
                {
                    title: "Sort List",
                    url: "https://leetcode.com/problems/sort-list/",
                },
                {
                    title: "Kth Largest Element in an Array",
                    url: "https://leetcode.com/problems/kth-largest-element-in-an-array/",
                },
                {
                    title: "Kth Largest Element in a Stream",
                    url: "https://leetcode.com/problems/kth-largest-element-in-a-stream/",
                },
                {
                    title: "The Skyline Problem",
                    url: "https://leetcode.com/problems/the-skyline-problem/",
                },
                {
                    title: "Maximum Subarray",
                    url: "https://leetcode.com/problems/maximum-subarray/",
                },
            ],
        ),
        createTopic(
            "b6-backtracking-fundamentals",
            "Backtracking: choose, explore, un-choose and pruning",
            [
                "https://www.geeksforgeeks.org/backtracking-algorithms/",
                "https://leetcode.com/explore/learn/card/recursion-ii/",
                "https://www.programiz.com/dsa/backtracking-algorithm",
            ],
            [
                {
                    title: "Subsets",
                    url: "https://leetcode.com/problems/subsets/",
                },
                {
                    title: "Permutations",
                    url: "https://leetcode.com/problems/permutations/",
                },
                {
                    title: "Combination Sum",
                    url: "https://leetcode.com/problems/combination-sum/",
                },
                {
                    title: "Generate Parentheses",
                    url: "https://leetcode.com/problems/generate-parentheses/",
                },
                {
                    title: "Letter Combinations of a Phone Number",
                    url: "https://leetcode.com/problems/letter-combinations-of-a-phone-number/",
                },
                {
                    title: "Word Search",
                    url: "https://leetcode.com/problems/word-search/",
                },
            ],
        ),
        createTopic(
            "b6-subsets-subsequences-power-set",
            "Generating possibilities: subsets, subsequences, power set, permutations and combinations",
            [
                "https://www.geeksforgeeks.org/power-set/",
                "https://www.geeksforgeeks.org/print-subsequences-string/",
                "https://www.geeksforgeeks.org/permutations-of-a-given-string/",
            ],
            [
                {
                    title: "Subsets",
                    url: "https://leetcode.com/problems/subsets/",
                },
                {
                    title: "Subsets II",
                    url: "https://leetcode.com/problems/subsets-ii/",
                },
                {
                    title: "Permutations",
                    url: "https://leetcode.com/problems/permutations/",
                },
                {
                    title: "Permutations II",
                    url: "https://leetcode.com/problems/permutations-ii/",
                },
                {
                    title: "Combinations",
                    url: "https://leetcode.com/problems/combinations/",
                },
                {
                    title: "Combination Sum",
                    url: "https://leetcode.com/problems/combination-sum/",
                },
            ],
        ),
        createTopic(
            "b6-permutations-duplicate-handling",
            "Duplicate handling in subsets, permutations and combinations",
            [
                "https://leetcode.com/problems/subsets-ii/solutions/",
                "https://leetcode.com/problems/permutations-ii/solutions/",
                "https://www.geeksforgeeks.org/print-all-possible-combinations-of-r-elements-in-a-given-array-of-size-n/",
            ],
            [
                {
                    title: "Subsets II",
                    url: "https://leetcode.com/problems/subsets-ii/",
                },
                {
                    title: "Permutations II",
                    url: "https://leetcode.com/problems/permutations-ii/",
                },
                {
                    title: "Combination Sum II",
                    url: "https://leetcode.com/problems/combination-sum-ii/",
                },
                {
                    title: "Letter Tile Possibilities",
                    url: "https://leetcode.com/problems/letter-tile-possibilities/",
                },
                {
                    title: "Non-decreasing Subsequences",
                    url: "https://leetcode.com/problems/non-decreasing-subsequences/",
                },
                {
                    title: "Beautiful Arrangement",
                    url: "https://leetcode.com/problems/beautiful-arrangement/",
                },
            ],
        ),
        createTopic(
            "b6-constraint-based-search-word-search-n-queens-sudoku-and-rat-in-a-maze",
            "Constraint-based search: Word Search, N-Queens, Sudoku and Rat in a Maze",
            [
                "https://www.geeksforgeeks.org/n-queen-problem-backtracking-3/",
                "https://www.geeksforgeeks.org/sudoku-backtracking-7/",
                "https://www.geeksforgeeks.org/rat-in-a-maze-backtracking-2/",
            ],
            [
                {
                    title: "Word Search",
                    url: "https://leetcode.com/problems/word-search/",
                },
                {
                    title: "N-Queens",
                    url: "https://leetcode.com/problems/n-queens/",
                },
                {
                    title: "N-Queens II",
                    url: "https://leetcode.com/problems/n-queens-ii/",
                },
                {
                    title: "Sudoku Solver",
                    url: "https://leetcode.com/problems/sudoku-solver/",
                },
                {
                    title: "Unique Paths III",
                    url: "https://leetcode.com/problems/unique-paths-iii/",
                },
                {
                    title: "Path with Maximum Gold",
                    url: "https://leetcode.com/problems/path-with-maximum-gold/",
                },
            ],
        ),
    ],
};

export default Belt6;
