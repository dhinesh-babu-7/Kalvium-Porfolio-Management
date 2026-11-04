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

const Belt4 = {
    id: 4,
    title: "Purple Belt",
    subtitle: "Array Techniques and Sorting",
    topics: [
        createTopic(
            "b4-subarrays-and-subsequences-generation-and-subarray-sum-problems",
            "Subarrays and subsequences: generation and subarray-sum problems",
            [
                "https://www.geeksforgeeks.org/subarraysubstring-vs-subsequence-and-programs-to-generate-them/",
                "https://www.geeksforgeeks.org/largest-sum-contiguous-subarray/",
                "https://leetcode.com/explore/learn/card/array-and-string/",
            ],
            [
                {
                    title: "Maximum Subarray",
                    url: "https://leetcode.com/problems/maximum-subarray/",
                },
                {
                    title: "Maximum Average Subarray I",
                    url: "https://leetcode.com/problems/maximum-average-subarray-i/",
                },
                {
                    title: "Subarray Sum Equals K",
                    url: "https://leetcode.com/problems/subarray-sum-equals-k/",
                },
                {
                    title: "Minimum Size Subarray Sum",
                    url: "https://leetcode.com/problems/minimum-size-subarray-sum/",
                },
                {
                    title: "Maximum Product Subarray",
                    url: "https://leetcode.com/problems/maximum-product-subarray/",
                },
                {
                    title: "Number of Sub-arrays of Size K and Average Greater than or Equal to Threshold",
                    url: "https://leetcode.com/problems/number-of-sub-arrays-of-size-k-and-average-greater-than-or-equal-to-threshold/",
                },
            ],
        ),
        createTopic(
            "b4-prefix-suffix-sums-and-prefix-xor-pivot-index-and-product-except-self",
            "Prefix/suffix sums and prefix XOR: pivot index and product except self",
            [
                "https://www.geeksforgeeks.org/prefix-sum-array-implementation-applications-competitive-programming/",
                "https://usaco.guide/silver/prefix-sums",
                "https://www.geeksforgeeks.org/prefix-xor-array/",
            ],
            [
                {
                    title: "Find Pivot Index",
                    url: "https://leetcode.com/problems/find-pivot-index/",
                },
                {
                    title: "Range Sum Query - Immutable",
                    url: "https://leetcode.com/problems/range-sum-query-immutable/",
                },
                {
                    title: "Product of Array Except Self",
                    url: "https://leetcode.com/problems/product-of-array-except-self/",
                },
                {
                    title: "Find the Highest Altitude",
                    url: "https://leetcode.com/problems/find-the-highest-altitude/",
                },
                {
                    title: "Left and Right Sum Differences",
                    url: "https://leetcode.com/problems/left-and-right-sum-differences/",
                },
                {
                    title: "XOR Queries of a Subarray",
                    url: "https://leetcode.com/problems/xor-queries-of-a-subarray/",
                },
            ],
        ),
        createTopic(
            "b4-hashing-counting-lookup-two-sum-subarray-sum-k-and-group-anagrams",
            "Hashing: counting, lookup, Two Sum, subarray sum K and group anagrams",
            [
                "https://www.geeksforgeeks.org/hashing-data-structure/",
                "https://www.programiz.com/python-programming/dictionary",
                "https://usaco.guide/silver/hashmaps",
            ],
            [
                {
                    title: "Two Sum",
                    url: "https://leetcode.com/problems/two-sum/",
                },
                {
                    title: "Group Anagrams",
                    url: "https://leetcode.com/problems/group-anagrams/",
                },
                {
                    title: "Subarray Sum Equals K",
                    url: "https://leetcode.com/problems/subarray-sum-equals-k/",
                },
                {
                    title: "Top K Frequent Elements",
                    url: "https://leetcode.com/problems/top-k-frequent-elements/",
                },
                {
                    title: "Longest Consecutive Sequence",
                    url: "https://leetcode.com/problems/longest-consecutive-sequence/",
                },
                {
                    title: "4Sum II",
                    url: "https://leetcode.com/problems/4sum-ii/",
                },
            ],
        ),
        createTopic(
            "b4-kadanes-algorithm",
            "Classic array algorithms: Kadane's, Dutch National Flag and Moore's Voting",
            [
                "https://www.geeksforgeeks.org/largest-sum-contiguous-subarray/",
                "https://www.geeksforgeeks.org/sort-an-array-of-0s-1s-and-2s/",
                "https://www.geeksforgeeks.org/boyer-moore-majority-voting-algorithm/",
            ],
            [
                {
                    title: "Maximum Subarray",
                    url: "https://leetcode.com/problems/maximum-subarray/",
                },
                {
                    title: "Maximum Product Subarray",
                    url: "https://leetcode.com/problems/maximum-product-subarray/",
                },
                {
                    title: "Sort Colors",
                    url: "https://leetcode.com/problems/sort-colors/",
                },
                {
                    title: "Majority Element",
                    url: "https://leetcode.com/problems/majority-element/",
                },
                {
                    title: "Majority Element II",
                    url: "https://leetcode.com/problems/majority-element-ii/",
                },
                {
                    title: "Best Time to Buy and Sell Stock",
                    url: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/",
                },
            ],
        ),
        createTopic(
            "b4-sliding-window",
            "Sliding window: fixed-size and variable-size windows",
            [
                "https://www.geeksforgeeks.org/window-sliding-technique/",
                "https://www.programiz.com/dsa/sliding-window-technique",
                "https://leetcode.com/discuss/study-guide/657507/",
            ],
            [
                {
                    title: "Maximum Average Subarray I",
                    url: "https://leetcode.com/problems/maximum-average-subarray-i/",
                },
                {
                    title: "Minimum Size Subarray Sum",
                    url: "https://leetcode.com/problems/minimum-size-subarray-sum/",
                },
                {
                    title: "Longest Substring Without Repeating Characters",
                    url: "https://leetcode.com/problems/longest-substring-without-repeating-characters/",
                },
                {
                    title: "Permutation in String",
                    url: "https://leetcode.com/problems/permutation-in-string/",
                },
                {
                    title: "Find All Anagrams in a String",
                    url: "https://leetcode.com/problems/find-all-anagrams-in-a-string/",
                },
                {
                    title: "Max Consecutive Ones III",
                    url: "https://leetcode.com/problems/max-consecutive-ones-iii/",
                },
            ],
        ),
        createTopic(
            "b4-basic-sorting",
            "Elementary sorting: Bubble, Selection and Insertion Sort; stability",
            [
                "https://www.geeksforgeeks.org/bubble-sort-algorithm/",
                "https://www.geeksforgeeks.org/selection-sort-algorithm-2/",
                "https://www.geeksforgeeks.org/insertion-sort-algorithm/",
            ],
            [
                {
                    title: "Sort an Array",
                    url: "https://leetcode.com/problems/sort-an-array/",
                },
                {
                    title: "Sort Colors",
                    url: "https://leetcode.com/problems/sort-colors/",
                },
                {
                    title: "Largest Number",
                    url: "https://leetcode.com/problems/largest-number/",
                },
                {
                    title: "Relative Sort Array",
                    url: "https://leetcode.com/problems/relative-sort-array/",
                },
                {
                    title: "Height Checker",
                    url: "https://leetcode.com/problems/height-checker/",
                },
                {
                    title: "Insertion Sort List",
                    url: "https://leetcode.com/problems/insertion-sort-list/",
                },
            ],
        ),
        createTopic(
            "b4-two-pointers-opposite-ends-same-direction-and-three-sum",
            "Two pointers: opposite ends, same direction and Three Sum",
            [
                "https://www.geeksforgeeks.org/two-pointers-technique/",
                "https://leetcode.com/explore/learn/card/array-and-string/",
                "https://www.programiz.com/dsa/two-pointer-technique",
            ],
            [
                {
                    title: "Two Sum II - Input Array Is Sorted",
                    url: "https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/",
                },
                {
                    title: "3Sum",
                    url: "https://leetcode.com/problems/3sum/",
                },
                {
                    title: "Container With Most Water",
                    url: "https://leetcode.com/problems/container-with-most-water/",
                },
                {
                    title: "Remove Duplicates from Sorted Array",
                    url: "https://leetcode.com/problems/remove-duplicates-from-sorted-array/",
                },
                {
                    title: "Move Zeroes",
                    url: "https://leetcode.com/problems/move-zeroes/",
                },
                {
                    title: "Trapping Rain Water",
                    url: "https://leetcode.com/problems/trapping-rain-water/",
                },
            ],
        ),
        createTopic(
            "b4-binary-search-lower-upper-bound-rotated-arrays-2d-matrices-and-peak-element",
            "Binary search: lower/upper bound, rotated arrays, 2D matrices and peak element",
            [
                "https://www.geeksforgeeks.org/binary-search/",
                "https://cp-algorithms.com/num_methods/binary_search.html",
                "https://leetcode.com/explore/learn/card/binary-search/",
            ],
            [
                {
                    title: "Binary Search",
                    url: "https://leetcode.com/problems/binary-search/",
                },
                {
                    title: "Find First and Last Position of Element in Sorted Array",
                    url: "https://leetcode.com/problems/find-first-and-last-position-of-element-in-sorted-array/",
                },
                {
                    title: "Search in Rotated Sorted Array",
                    url: "https://leetcode.com/problems/search-in-rotated-sorted-array/",
                },
                {
                    title: "Find Minimum in Rotated Sorted Array",
                    url: "https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/",
                },
                {
                    title: "Find Peak Element",
                    url: "https://leetcode.com/problems/find-peak-element/",
                },
                {
                    title: "Search a 2D Matrix",
                    url: "https://leetcode.com/problems/search-a-2d-matrix/",
                },
            ],
        ),
        createTopic(
            "b4-counting-sort-and-radix-sort-non-comparison-sorting",
            "Counting Sort and Radix Sort: non-comparison sorting",
            [
                "https://www.geeksforgeeks.org/counting-sort/",
                "https://www.geeksforgeeks.org/radix-sort/",
                "https://www.programiz.com/dsa/counting-sort",
            ],
            [
                {
                    title: "Sort an Array",
                    url: "https://leetcode.com/problems/sort-an-array/",
                },
                {
                    title: "Sort Colors",
                    url: "https://leetcode.com/problems/sort-colors/",
                },
                {
                    title: "Relative Sort Array",
                    url: "https://leetcode.com/problems/relative-sort-array/",
                },
                {
                    title: "Maximum Gap",
                    url: "https://leetcode.com/problems/maximum-gap/",
                },
                {
                    title: "H-Index",
                    url: "https://leetcode.com/problems/h-index/",
                },
                {
                    title: "Height Checker",
                    url: "https://leetcode.com/problems/height-checker/",
                },
            ],
        ),
    ],
};

export default Belt4;
