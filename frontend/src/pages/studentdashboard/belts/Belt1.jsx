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

const Belt1 = {
    id: 1,
    title: "Yellow Belt",
    subtitle: "Programming Basics",
    topics: [
        createTopic(
            "b1-variables-assignment-data-types",
            "Variables, assignment, data types, constants and type conversion",
            [
                "https://www.programiz.com/python-programming/variables-datatypes",
                "https://www.w3schools.com/python/python_variables.asp",
                "https://docs.python.org/3/tutorial/introduction.html",
            ],
            [
                {
                    title: "Add Two Integers",
                    url: "https://leetcode.com/problems/add-two-integers/",
                },
                {
                    title: "Concatenation of Array",
                    url: "https://leetcode.com/problems/concatenation-of-array/",
                },
                {
                    title: "Richest Customer Wealth",
                    url: "https://leetcode.com/problems/richest-customer-wealth/",
                },
                {
                    title: "Number of Good Pairs",
                    url: "https://leetcode.com/problems/number-of-good-pairs/",
                },
                {
                    title: "Shuffle the Array",
                    url: "https://leetcode.com/problems/shuffle-the-array/",
                },
                {
                    title: "Final Value of Variable After Performing Operations",
                    url: "https://leetcode.com/problems/final-value-of-variable-after-performing-operations/",
                },
            ],
        ),
        createTopic(
            "b1-variable-scope-debugging",
            "Variable scope: local and global variables",
            [
                "https://www.programiz.com/python-programming/global-local-nonlocal-variables",
                "https://www.w3schools.com/python/python_scope.asp",
                "https://docs.python.org/3/tutorial/classes.html#python-scopes-and-namespaces",
            ],
            [
                {
                    title: "Create Hello World Function",
                    url: "https://leetcode.com/problems/create-hello-world-function/",
                },
                {
                    title: "Counter",
                    url: "https://leetcode.com/problems/counter/",
                },
                {
                    title: "To Be Or Not To Be",
                    url: "https://leetcode.com/problems/to-be-or-not-to-be/",
                },
                {
                    title: "Return Length of Arguments Passed",
                    url: "https://leetcode.com/problems/return-length-of-arguments-passed/",
                },
                {
                    title: "Apply Transform Over Each Element in Array",
                    url: "https://leetcode.com/problems/apply-transform-over-each-element-in-array/",
                },
                {
                    title: "Memoize",
                    url: "https://leetcode.com/problems/memoize/",
                },
            ],
        ),
        createTopic(
            "b1-operators-precedence",
            "Operators and expressions: arithmetic, relational, logical, conditional and assignment operators; Boolean expressions and precedence",
            [
                "https://www.programiz.com/python-programming/operators",
                "https://www.w3schools.com/python/python_operators.asp",
                "https://docs.python.org/3/reference/expressions.html",
            ],
            [
                {
                    title: "Subtract the Product and Sum of Digits of an Integer",
                    url: "https://leetcode.com/problems/subtract-the-product-and-sum-of-digits-of-an-integer/",
                },
                {
                    title: "Number of Steps to Reduce a Number to Zero",
                    url: "https://leetcode.com/problems/number-of-steps-to-reduce-a-number-to-zero/",
                },
                {
                    title: "Calculate Money in Leetcode Bank",
                    url: "https://leetcode.com/problems/calculate-money-in-leetcode-bank/",
                },
                {
                    title: "Sum of Squares of Special Elements",
                    url: "https://leetcode.com/problems/sum-of-squares-of-special-elements/",
                },
                {
                    title: "Find the Highest Altitude",
                    url: "https://leetcode.com/problems/find-the-highest-altitude/",
                },
                {
                    title: "Smallest Even Multiple",
                    url: "https://leetcode.com/problems/smallest-even-multiple/",
                },
            ],
        ),
        createTopic(
            "b1-input-output-and-formatted-output",
            "Input/output and formatted output",
            [
                "https://www.programiz.com/python-programming/input-output-import",
                "https://www.w3schools.com/python/python_user_input.asp",
                "https://docs.python.org/3/tutorial/inputoutput.html",
            ],
            [
                {
                    title: "Fizz Buzz",
                    url: "https://leetcode.com/problems/fizz-buzz/",
                },
                {
                    title: "Add Two Integers",
                    url: "https://leetcode.com/problems/add-two-integers/",
                },
                {
                    title: "Richest Customer Wealth",
                    url: "https://leetcode.com/problems/richest-customer-wealth/",
                },
                {
                    title: "Number of Good Pairs",
                    url: "https://leetcode.com/problems/number-of-good-pairs/",
                },
                {
                    title: "Kids With the Greatest Number of Candies",
                    url: "https://leetcode.com/problems/kids-with-the-greatest-number-of-candies/",
                },
                {
                    title: "Running Sum of 1d Array",
                    url: "https://leetcode.com/problems/running-sum-of-1d-array/",
                },
            ],
        ),
        createTopic(
            "b1-boolean-conditions",
            "Conditionals: if, if-else, nested if-else, switch and ternary operator",
            [
                "https://www.programiz.com/python-programming/if-elif-else",
                "https://www.w3schools.com/python/python_conditions.asp",
                "https://docs.python.org/3/tutorial/controlflow.html#if-statements",
            ],
            [
                {
                    title: "Fizz Buzz",
                    url: "https://leetcode.com/problems/fizz-buzz/",
                },
                {
                    title: "Maximum Number of Words Found in Sentences",
                    url: "https://leetcode.com/problems/maximum-number-of-words-found-in-sentences/",
                },
                {
                    title: "Number of Employees Who Met the Target",
                    url: "https://leetcode.com/problems/number-of-employees-who-met-the-target/",
                },
                {
                    title: "Neither Minimum nor Maximum",
                    url: "https://leetcode.com/problems/neither-minimum-nor-maximum/",
                },
                {
                    title: "Find the Town Judge",
                    url: "https://leetcode.com/problems/find-the-town-judge/",
                },
                {
                    title: "Check if Two Chessboard Squares Have the Same Color",
                    url: "https://leetcode.com/problems/check-if-two-chessboard-squares-have-the-same-color/",
                },
            ],
        ),
        createTopic(
            "b1-functions-parameters-return-values-and-pass-by-value-reference",
            "Functions, parameters, return values and pass-by-value/reference",
            [
                "https://www.programiz.com/python-programming/function",
                "https://www.w3schools.com/python/python_functions.asp",
                "https://docs.python.org/3/tutorial/controlflow.html#defining-functions",
            ],
            [
                {
                    title: "Create Hello World Function",
                    url: "https://leetcode.com/problems/create-hello-world-function/",
                },
                {
                    title: "Counter",
                    url: "https://leetcode.com/problems/counter/",
                },
                {
                    title: "To Be Or Not To Be",
                    url: "https://leetcode.com/problems/to-be-or-not-to-be/",
                },
                {
                    title: "Return Length of Arguments Passed",
                    url: "https://leetcode.com/problems/return-length-of-arguments-passed/",
                },
                {
                    title: "Apply Transform Over Each Element in Array",
                    url: "https://leetcode.com/problems/apply-transform-over-each-element-in-array/",
                },
                {
                    title: "Filter Elements from Array",
                    url: "https://leetcode.com/problems/filter-elements-from-array/",
                },
            ],
        ),
        createTopic(
            "b1-basic-debugging-and-tracing-syntax-runtime-and-logical-errors",
            "Basic debugging and tracing: syntax, runtime and logical errors",
            [
                "https://www.programiz.com/python-programming/debugging",
                "https://docs.python.org/3/library/pdb.html",
                "https://realpython.com/python-debugging-pdb/",
            ],
            [
                {
                    title: "Fizz Buzz",
                    url: "https://leetcode.com/problems/fizz-buzz/",
                },
                {
                    title: "Palindrome Number",
                    url: "https://leetcode.com/problems/palindrome-number/",
                },
                {
                    title: "Reverse Integer",
                    url: "https://leetcode.com/problems/reverse-integer/",
                },
                {
                    title: "Plus One",
                    url: "https://leetcode.com/problems/plus-one/",
                },
                {
                    title: "Add Digits",
                    url: "https://leetcode.com/problems/add-digits/",
                },
                {
                    title: "Number of Steps to Reduce a Number to Zero",
                    url: "https://leetcode.com/problems/number-of-steps-to-reduce-a-number-to-zero/",
                },
            ],
        ),
    ],
};

export default Belt1;
