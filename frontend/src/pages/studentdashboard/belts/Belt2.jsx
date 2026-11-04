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

const Belt2 = {
    id: 2,
    title: "Orange Belt",
    subtitle: "Loops and Iteration",
    topics: [
        createTopic(
            "b2-for-while-do-while",
            "Loops: for, while, do-while, nested loops and loop tracing",
            [
                "https://www.programiz.com/python-programming/for-loop",
                "https://www.programiz.com/python-programming/while-loop",
                "https://www.w3schools.com/python/python_for_loops.asp",
            ],
            [
                {
                    title: "Running Sum of 1d Array",
                    url: "https://leetcode.com/problems/running-sum-of-1d-array/",
                },
                {
                    title: "Fizz Buzz",
                    url: "https://leetcode.com/problems/fizz-buzz/",
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
                    title: "Find Numbers with Even Number of Digits",
                    url: "https://leetcode.com/problems/find-numbers-with-even-number-of-digits/",
                },
                {
                    title: "Count Odd Numbers in an Interval Range",
                    url: "https://leetcode.com/problems/count-odd-numbers-in-an-interval-range/",
                },
            ],
        ),
        createTopic(
            "b2-break-continue-sentinel-loops",
            "Control flow: break, continue, sentinel values and input-driven termination; infinite loops",
            [
                "https://www.programiz.com/python-programming/break-continue",
                "https://www.w3schools.com/python/python_break.asp",
                "https://docs.python.org/3/tutorial/controlflow.html#break-and-continue-statements",
            ],
            [
                {
                    title: "Fizz Buzz",
                    url: "https://leetcode.com/problems/fizz-buzz/",
                },
                {
                    title: "Count the Number of Consistent Strings",
                    url: "https://leetcode.com/problems/count-the-number-of-consistent-strings/",
                },
                {
                    title: "Find Numbers with Even Number of Digits",
                    url: "https://leetcode.com/problems/find-numbers-with-even-number-of-digits/",
                },
                {
                    title: "Contains Duplicate",
                    url: "https://leetcode.com/problems/contains-duplicate/",
                },
                {
                    title: "Missing Number",
                    url: "https://leetcode.com/problems/missing-number/",
                },
                {
                    title: "Find All Numbers Disappeared in an Array",
                    url: "https://leetcode.com/problems/find-all-numbers-disappeared-in-an-array/",
                },
            ],
        ),
        createTopic(
            "b2-nested-loops-pattern-iteration",
            "Pattern printing: alphabets, numbers, stars, pyramids, diamonds and hollow patterns",
            [
                "https://www.geeksforgeeks.org/star-patterns-in-python/",
                "https://www.programiz.com/python-programming/examples/pyramid-pattern",
                "https://www.geeksforgeeks.org/pattern-printing-in-python/",
            ],
            [
                {
                    title: "Fizz Buzz",
                    url: "https://leetcode.com/problems/fizz-buzz/",
                },
                {
                    title: "Build Array from Permutation",
                    url: "https://leetcode.com/problems/build-array-from-permutation/",
                },
                {
                    title: "Concatenation of Array",
                    url: "https://leetcode.com/problems/concatenation-of-array/",
                },
                {
                    title: "Running Sum of 1d Array",
                    url: "https://leetcode.com/problems/running-sum-of-1d-array/",
                },
                {
                    title: "Pascal's Triangle",
                    url: "https://leetcode.com/problems/pascals-triangle/",
                },
                {
                    title: "Pascal's Triangle II",
                    url: "https://leetcode.com/problems/pascals-triangle-ii/",
                },
            ],
        ),
        createTopic(
            "b2-basic-mathematics-gcd-lcm-primes-and-sieve-of-eratosthenes",
            "Basic mathematics: GCD, LCM, primes and Sieve of Eratosthenes",
            [
                "https://www.programiz.com/python-programming/examples/hcf",
                "https://cp-algorithms.com/algebra/sieve-of-eratosthenes.html",
                "https://www.geeksforgeeks.org/euclidean-algorithms-basic-and-extended/",
            ],
            [
                {
                    title: "Count Primes",
                    url: "https://leetcode.com/problems/count-primes/",
                },
                {
                    title: "Ugly Number",
                    url: "https://leetcode.com/problems/ugly-number/",
                },
                {
                    title: "Greatest Common Divisor of Strings",
                    url: "https://leetcode.com/problems/greatest-common-divisor-of-strings/",
                },
                {
                    title: "Find Greatest Common Divisor of Array",
                    url: "https://leetcode.com/problems/find-greatest-common-divisor-of-array/",
                },
                {
                    title: "Count Common Factors",
                    url: "https://leetcode.com/problems/count-common-factors/",
                },
                {
                    title: "Prime Arrangements",
                    url: "https://leetcode.com/problems/prime-arrangements/",
                },
            ],
        ),
        createTopic(
            "b2-digit-problems-modular-arithmetic-fast-exponentiation-and-fractions",
            "Digit problems, modular arithmetic, fast exponentiation and fractions",
            [
                "https://cp-algorithms.com/algebra/binary-exp.html",
                "https://www.programiz.com/python-programming/examples/digit-sum",
                "https://www.geeksforgeeks.org/modular-arithmetic/",
            ],
            [
                {
                    title: "Palindrome Number",
                    url: "https://leetcode.com/problems/palindrome-number/",
                },
                {
                    title: "Reverse Integer",
                    url: "https://leetcode.com/problems/reverse-integer/",
                },
                {
                    title: "Add Digits",
                    url: "https://leetcode.com/problems/add-digits/",
                },
                {
                    title: "Pow(x, n)",
                    url: "https://leetcode.com/problems/powx-n/",
                },
                {
                    title: "Super Pow",
                    url: "https://leetcode.com/problems/super-pow/",
                },
                {
                    title: "Fraction Addition and Subtraction",
                    url: "https://leetcode.com/problems/fraction-addition-and-subtraction/",
                },
            ],
        ),
        createTopic(
            "b2-complexity-o-1-o-n-o-n-and-the-cost-of-nested-loops",
            "Complexity: O(1), O(n), O(n\u00b2) and the cost of nested loops",
            [
                "https://www.geeksforgeeks.org/analysis-of-algorithms-set-1-asymptotic-analysis/",
                "https://www.programiz.com/dsa/asymptotic-notations",
                "https://www.bigocheatsheet.com/",
            ],
            [
                {
                    title: "Contains Duplicate",
                    url: "https://leetcode.com/problems/contains-duplicate/",
                },
                {
                    title: "Two Sum",
                    url: "https://leetcode.com/problems/two-sum/",
                },
                {
                    title: "Running Sum of 1d Array",
                    url: "https://leetcode.com/problems/running-sum-of-1d-array/",
                },
                {
                    title: "Number of Good Pairs",
                    url: "https://leetcode.com/problems/number-of-good-pairs/",
                },
                {
                    title: "Richest Customer Wealth",
                    url: "https://leetcode.com/problems/richest-customer-wealth/",
                },
                {
                    title: "Find Numbers with Even Number of Digits",
                    url: "https://leetcode.com/problems/find-numbers-with-even-number-of-digits/",
                },
            ],
        ),
    ],
};

export default Belt2;
