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

const Belt3 = {
    id: 3,
    title: "Green Belt",
    subtitle: "Arrays, Strings and Complexity",
    topics: [
        createTopic(
            "b3-arrays-crud-indexing-bounds-and-traversal",
            "Arrays: CRUD, indexing, bounds and traversal",
            [
                "https://www.programiz.com/python-programming/list",
                "https://www.geeksforgeeks.org/array-data-structure-guide/",
                "https://docs.python.org/3/tutorial/datastructures.html",
            ],
            [
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
                    title: "Remove Element",
                    url: "https://leetcode.com/problems/remove-element/",
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
            "b3-array-operations-insertion-deletion-by-shifting-reverse-rotate-merge-sorted-arrays-and-rearrangement",
            "Array operations: insertion/deletion by shifting, reverse, rotate, merge sorted arrays and rearrangement",
            [
                "https://www.geeksforgeeks.org/array-data-structure-guide/",
                "https://www.programiz.com/python-programming/list",
                "https://www.geeksforgeeks.org/array-rotation/",
            ],
            [
                {
                    title: "Reverse String",
                    url: "https://leetcode.com/problems/reverse-string/",
                },
                {
                    title: "Rotate Array",
                    url: "https://leetcode.com/problems/rotate-array/",
                },
                {
                    title: "Merge Sorted Array",
                    url: "https://leetcode.com/problems/merge-sorted-array/",
                },
                {
                    title: "Move Zeroes",
                    url: "https://leetcode.com/problems/move-zeroes/",
                },
                {
                    title: "Replace Elements with Greatest Element on Right Side",
                    url: "https://leetcode.com/problems/replace-elements-with-greatest-element-on-right-side/",
                },
                {
                    title: "Shuffle the Array",
                    url: "https://leetcode.com/problems/shuffle-the-array/",
                },
            ],
        ),
        createTopic(
            "b3-strings-crud-substrings-comparison-palindrome-anagram-reversal-and-basic-compression",
            "Strings: CRUD, substrings, comparison, palindrome, anagram, reversal and basic compression",
            [
                "https://www.programiz.com/python-programming/string",
                "https://www.geeksforgeeks.org/string-data-structure/",
                "https://docs.python.org/3/library/stdtypes.html#text-sequence-type-str",
            ],
            [
                {
                    title: "Valid Palindrome",
                    url: "https://leetcode.com/problems/valid-palindrome/",
                },
                {
                    title: "Reverse String",
                    url: "https://leetcode.com/problems/reverse-string/",
                },
                {
                    title: "Valid Anagram",
                    url: "https://leetcode.com/problems/valid-anagram/",
                },
                {
                    title: "Longest Common Prefix",
                    url: "https://leetcode.com/problems/longest-common-prefix/",
                },
                {
                    title: "Find the Index of the First Occurrence in a String",
                    url: "https://leetcode.com/problems/find-the-index-of-the-first-occurrence-in-a-string/",
                },
                {
                    title: "String Compression",
                    url: "https://leetcode.com/problems/string-compression/",
                },
            ],
        ),
        createTopic(
            "b3-matrices-2d-arrays",
            "Matrices / 2D arrays: traversal, transpose, rotation, spiral, boundary, diagonal traversal and search",
            [
                "https://www.programiz.com/python-programming/matrix",
                "https://www.geeksforgeeks.org/matrix/",
                "https://leetcode.com/explore/learn/card/array-and-string/",
            ],
            [
                {
                    title: "Matrix Diagonal Sum",
                    url: "https://leetcode.com/problems/matrix-diagonal-sum/",
                },
                {
                    title: "Transpose Matrix",
                    url: "https://leetcode.com/problems/transpose-matrix/",
                },
                {
                    title: "Reshape the Matrix",
                    url: "https://leetcode.com/problems/reshape-the-matrix/",
                },
                {
                    title: "Spiral Matrix",
                    url: "https://leetcode.com/problems/spiral-matrix/",
                },
                {
                    title: "Rotate Image",
                    url: "https://leetcode.com/problems/rotate-image/",
                },
                {
                    title: "Search a 2D Matrix",
                    url: "https://leetcode.com/problems/search-a-2d-matrix/",
                },
            ],
        ),
        createTopic(
            "b3-frequency-hash-map",
            "Frequency counting: most/least frequent elements and permutation checks",
            [
                "https://www.geeksforgeeks.org/counting-frequencies-of-array-elements/",
                "https://www.programiz.com/python-programming/dictionary",
                "https://www.geeksforgeeks.org/anagram-substring-search-search-permutations/",
            ],
            [
                {
                    title: "Majority Element",
                    url: "https://leetcode.com/problems/majority-element/",
                },
                {
                    title: "Single Number",
                    url: "https://leetcode.com/problems/single-number/",
                },
                {
                    title: "Valid Anagram",
                    url: "https://leetcode.com/problems/valid-anagram/",
                },
                {
                    title: "Ransom Note",
                    url: "https://leetcode.com/problems/ransom-note/",
                },
                {
                    title: "Find the Difference",
                    url: "https://leetcode.com/problems/find-the-difference/",
                },
                {
                    title: "Top K Frequent Elements",
                    url: "https://leetcode.com/problems/top-k-frequent-elements/",
                },
            ],
        ),
        createTopic(
            "b3-time-growth-complexity",
            "Complexity growth: constant, linear and quadratic",
            [
                "https://www.programiz.com/dsa/asymptotic-notations",
                "https://www.geeksforgeeks.org/analysis-of-algorithms-set-1-asymptotic-analysis/",
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
                    title: "Maximum Subarray",
                    url: "https://leetcode.com/problems/maximum-subarray/",
                },
                {
                    title: "Product of Array Except Self",
                    url: "https://leetcode.com/problems/product-of-array-except-self/",
                },
            ],
        ),
    ],
};

export default Belt3;
