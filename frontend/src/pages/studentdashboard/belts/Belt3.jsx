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

const Belt3 = {
    id: 3,
    title: "Belt 3",
    subtitle: "Strings, Hash Maps and Matrices",
    topics: [
        createTopic(
            "b3-frequency-hash-map",
            "Frequency Counting and Hash Maps",
            "https://www.programiz.com/python-programming/dictionary",
            leetCodePractice([
                ["Valid Palindrome", "valid-palindrome"],
                ["Reverse String", "reverse-string"],
                ["Length of Last Word", "length-of-last-word"],
                ["Longest Common Prefix", "longest-common-prefix"],
                ["Reverse Words in a String II", "reverse-words-in-a-string-ii"],
                [
                    "Find the Index of the First Occurrence in a String",
                    "find-the-index-of-the-first-occurrence-in-a-string",
                ],
            ])
        ),
        createTopic(
            "b3-matrices-2d-arrays",
            "Matrices, 2D Arrays and Nested Traversal",
            "https://www.programiz.com/python-programming/matrix",
            leetCodePractice([
                ["Richest Customer Wealth", "richest-customer-wealth"],
                ["Matrix Diagonal Sum", "matrix-diagonal-sum"],
                ["Transpose Matrix", "transpose-matrix"],
                ["Reshape the Matrix", "reshape-the-matrix"],
                ["Lucky Numbers in a Matrix", "lucky-numbers-in-a-matrix"],
                ["Set Matrix Zeroes", "set-matrix-zeroes"],
            ])
        ),
        createTopic(
            "b3-time-growth-complexity",
            "Time Growth: Constant, Linear and Quadratic",
            "https://www.programiz.com/dsa/asymptotic-notations",
            leetCodePractice([
                ["Contains Duplicate", "contains-duplicate"],
                ["Two Sum", "two-sum"],
                ["Maximum Subarray", "maximum-subarray"],
                ["Best Time to Buy and Sell Stock", "best-time-to-buy-and-sell-stock"],
                ["Product of Array Except Self", "product-of-array-except-self"],
                ["3Sum", "3sum"],
            ])
        ),
    ],
};

export default Belt3;
