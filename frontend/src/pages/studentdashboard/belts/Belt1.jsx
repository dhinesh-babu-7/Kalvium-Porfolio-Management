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

const Belt1 = {
    id: 1,
    title: "Belt 1",
    subtitle: "Programming Basics",
    topics: [
        createTopic(
            "b1-variables-assignment-data-types",
            "Variables, Assignment, Data Types, Input/Output and Type Conversion",
            "https://www.programiz.com/python-programming/variables-datatypes",
            [
                ["Add Two Integers", "add-two-integers"],
                ["Concatenation of Array", "concatenation-of-array"],
                ["Richest Customer Wealth", "richest-customer-wealth"],
                ["Number of Good Pairs", "number-of-good-pairs"],
                ["Shuffle the Array", "shuffle-the-array"],
                [
                    "Final Value of Variable After Performing Operations",
                    "final-value-of-variable-after-performing-operations",
                ],
            ].map(([title, slug]) => ({
                title,
                url: `https://leetcode.com/problems/${slug}/`,
            }))
        ),
        createTopic(
            "b1-operators-precedence",
            "Arithmetic, Relational/Logical Operators and Operator Precedence",
            "https://www.programiz.com/python-programming/operators",
            [
                ["Calculate Money in Leetcode Bank", "calculate-money-in-leetcode-bank"],
                ["Add Binary", "add-binary"],
                [
                    "Subtract the Product and Sum of Digits of an Integer",
                    "subtract-the-product-and-sum-of-digits-of-an-integer",
                ],
                ["Sum of Squares of Special Elements", "sum-of-squares-of-special-elements"],
                [
                    "Number of Steps to Reduce a Number to Zero",
                    "number-of-steps-to-reduce-a-number-to-zero",
                ],
                ["Find the Highest Altitude", "find-the-highest-altitude"],
            ].map(([title, slug]) => ({
                title,
                url: `https://leetcode.com/problems/${slug}/`,
            }))
        ),
        createTopic(
            "b1-variable-scope-debugging",
            "Variable Scope and Basic Debugging",
            "https://www.programiz.com/python-programming/namespace",
            [
                ["Fizz Buzz", "fizz-buzz"],
                [
                    "Number of Steps to Reduce a Number to Zero",
                    "number-of-steps-to-reduce-a-number-to-zero",
                ],
                ["Palindrome Number", "palindrome-number"],
                ["Reverse Integer", "reverse-integer"],
                ["Plus One", "plus-one"],
                ["Add Digits", "add-digits"],
            ].map(([title, slug]) => ({
                title,
                url: `https://leetcode.com/problems/${slug}/`,
            }))
        ),
        createTopic(
            "b1-boolean-conditions",
            "Boolean Expressions, If/Else and Nested Conditions",
            "https://www.programiz.com/python-programming/if-elif-else",
            [
                ["Fizz Buzz", "fizz-buzz"],
                ["Number of Good Pairs", "number-of-good-pairs"],
                ["Find Pivot Index", "find-pivot-index"],
                [
                    "Maximum Number of Words Found in Sentences",
                    "maximum-number-of-words-found-in-sentences",
                ],
                ["Neither Minimum nor Maximum", "neither-minimum-nor-maximum"],
                [
                    "Divisible and Non-divisible Sums Difference",
                    "divisible-and-non-divisible-sums-difference",
                ],
            ].map(([title, slug]) => ({
                title,
                url: `https://leetcode.com/problems/${slug}/`,
            }))
        ),
        createTopic(
            "b1-switch-case",
            "Switch/Case and Conditional Problem Solving",
            "https://www.programiz.com/cpp-programming/switch-case",
            [
                ["Fizz Buzz", "fizz-buzz"],
                ["Roman to Integer", "roman-to-integer"],
                ["Integer to Roman", "integer-to-roman"],
                ["Excel Sheet Column Number", "excel-sheet-column-number"],
                ["Day of the Year", "day-of-the-year"],
                ["Reformat Date", "reformat-date"],
            ].map(([title, slug]) => ({
                title,
                url: `https://leetcode.com/problems/${slug}/`,
            }))
        ),
    ],
};

export default Belt1;
