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

const PYTHON_LOOPS_RESOURCE =
    "https://www.programiz.com/python-programming/while-loop";

const Belt2 = {
    id: 2,
    title: "Belt 2",
    subtitle: "Loops and Iteration",
    topics: [
        createTopic(
            "b2-for-while-do-while",
            "For, While and Do-While Loops; Loop Tracing",
            PYTHON_LOOPS_RESOURCE,
            leetCodePractice([
                ["Running Sum of 1d Array", "running-sum-of-1d-array"],
                ["Palindrome Number", "palindrome-number"],
                ["Reverse Integer", "reverse-integer"],
                ["Add Digits", "add-digits"],
                [
                    "Number of Steps to Reduce a Number to Zero",
                    "number-of-steps-to-reduce-a-number-to-zero",
                ],
                ["Calculate Money in Leetcode Bank", "calculate-money-in-leetcode-bank"],
            ])
        ),
        createTopic(
            "b2-break-continue-sentinel-loops",
            "Break, Continue, Sentinel Loops and Input-Driven Termination",
            PYTHON_LOOPS_RESOURCE,
            leetCodePractice([
                ["Fizz Buzz", "fizz-buzz"],
                ["Count the Number of Consistent Strings", "count-the-number-of-consistent-strings"],
                ["Find Numbers with Even Number of Digits", "find-numbers-with-even-number-of-digits"],
                ["Number of Good Pairs", "number-of-good-pairs"],
                ["Contains Duplicate", "contains-duplicate"],
                ["Missing Number", "missing-number"],
            ])
        ),
        createTopic(
            "b2-nested-loops-pattern-iteration",
            "Nested Loops and Pattern-Style Iteration",
            PYTHON_LOOPS_RESOURCE,
            leetCodePractice([
                ["Richest Customer Wealth", "richest-customer-wealth"],
                ["Matrix Diagonal Sum", "matrix-diagonal-sum"],
                ["Transpose Matrix", "transpose-matrix"],
                ["Reshape the Matrix", "reshape-the-matrix"],
                ["Lucky Numbers in a Matrix", "lucky-numbers-in-a-matrix"],
                ["Find Numbers with Even Number of Digits", "find-numbers-with-even-number-of-digits"],
            ])
        ),
        createTopic(
            "b2-count-condition-loops",
            "Count-Based vs Condition-Based Loops: Basic Complexity",
            PYTHON_LOOPS_RESOURCE,
            leetCodePractice([
                ["Running Sum of 1d Array", "running-sum-of-1d-array"],
                ["Contains Duplicate", "contains-duplicate"],
                ["Two Sum", "two-sum"],
                ["Maximum Subarray", "maximum-subarray"],
                ["Best Time to Buy and Sell Stock", "best-time-to-buy-and-sell-stock"],
                ["Find Pivot Index", "find-pivot-index"],
            ])
        ),
        createTopic(
            "b2-loop-array-string-problems",
            "Loop-Based Array and String Problems",
            PYTHON_LOOPS_RESOURCE,
            leetCodePractice([
                ["Find Numbers with Even Number of Digits", "find-numbers-with-even-number-of-digits"],
                ["Count Items Matching a Rule", "count-items-matching-a-rule"],
                ["Goal Parser Interpretation", "goal-parser-interpretation"],
                ["Defanging an IP Address", "defanging-an-ip-address"],
                ["Jewels and Stones", "jewels-and-stones"],
                ["Length of Last Word", "length-of-last-word"],
            ])
        ),
    ],
};

export default Belt2;
