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

const Belt5 = {
    id: 5,
    title: "Blue Belt",
    subtitle: "Linked Lists and Linear Data Structures",
    topics: [
        createTopic(
            "b5-singly-linked-lists",
            "Singly linked lists: implementation and basic operations",
            [
                "https://www.geeksforgeeks.org/data-structures/linked-list/",
                "https://www.programiz.com/dsa/linked-list",
                "https://leetcode.com/explore/learn/card/linked-list/",
            ],
            [
                {
                    title: "Design Linked List",
                    url: "https://leetcode.com/problems/design-linked-list/",
                },
                {
                    title: "Reverse Linked List",
                    url: "https://leetcode.com/problems/reverse-linked-list/",
                },
                {
                    title: "Middle of the Linked List",
                    url: "https://leetcode.com/problems/middle-of-the-linked-list/",
                },
                {
                    title: "Merge Two Sorted Lists",
                    url: "https://leetcode.com/problems/merge-two-sorted-lists/",
                },
                {
                    title: "Remove Linked List Elements",
                    url: "https://leetcode.com/problems/remove-linked-list-elements/",
                },
                {
                    title: "Palindrome Linked List",
                    url: "https://leetcode.com/problems/palindrome-linked-list/",
                },
            ],
        ),
        createTopic(
            "b5-doubly-circular-linked-lists",
            "Doubly and circular linked lists: implementation and operations",
            [
                "https://www.geeksforgeeks.org/doubly-linked-list/",
                "https://www.geeksforgeeks.org/circular-linked-list/",
                "https://www.programiz.com/dsa/doubly-linked-list",
            ],
            [
                {
                    title: "Design Linked List",
                    url: "https://leetcode.com/problems/design-linked-list/",
                },
                {
                    title: "Flatten a Multilevel Doubly Linked List",
                    url: "https://leetcode.com/problems/flatten-a-multilevel-doubly-linked-list/",
                },
                {
                    title: "Insert into a Sorted Circular Linked List",
                    url: "https://leetcode.com/problems/insert-into-a-sorted-circular-linked-list/",
                },
                {
                    title: "LRU Cache",
                    url: "https://leetcode.com/problems/lru-cache/",
                },
                {
                    title: "Remove Duplicates from Sorted List II",
                    url: "https://leetcode.com/problems/remove-duplicates-from-sorted-list-ii/",
                },
                {
                    title: "Rotate List",
                    url: "https://leetcode.com/problems/rotate-list/",
                },
            ],
        ),
        createTopic(
            "b5-linked-list-problem-solving-reverse-middle-node-and-merge-sorted-lists",
            "Linked-list problem solving: reverse, middle node and merge sorted lists",
            [
                "https://www.geeksforgeeks.org/reverse-a-linked-list/",
                "https://www.geeksforgeeks.org/middle-of-a-linked-list/",
                "https://www.geeksforgeeks.org/merge-two-sorted-linked-lists/",
            ],
            [
                {
                    title: "Reverse Linked List",
                    url: "https://leetcode.com/problems/reverse-linked-list/",
                },
                {
                    title: "Reverse Linked List II",
                    url: "https://leetcode.com/problems/reverse-linked-list-ii/",
                },
                {
                    title: "Middle of the Linked List",
                    url: "https://leetcode.com/problems/middle-of-the-linked-list/",
                },
                {
                    title: "Merge Two Sorted Lists",
                    url: "https://leetcode.com/problems/merge-two-sorted-lists/",
                },
                {
                    title: "Remove Nth Node From End of List",
                    url: "https://leetcode.com/problems/remove-nth-node-from-end-of-list/",
                },
                {
                    title: "Reorder List",
                    url: "https://leetcode.com/problems/reorder-list/",
                },
            ],
        ),
        createTopic(
            "b5-stacks",
            "Stacks: implementation, valid parentheses, next greater/smaller element, stock span and Min Stack",
            [
                "https://www.programiz.com/dsa/stack",
                "https://www.geeksforgeeks.org/stack-data-structure/",
                "https://leetcode.com/explore/learn/card/queue-stack/",
            ],
            [
                {
                    title: "Valid Parentheses",
                    url: "https://leetcode.com/problems/valid-parentheses/",
                },
                {
                    title: "Min Stack",
                    url: "https://leetcode.com/problems/min-stack/",
                },
                {
                    title: "Evaluate Reverse Polish Notation",
                    url: "https://leetcode.com/problems/evaluate-reverse-polish-notation/",
                },
                {
                    title: "Daily Temperatures",
                    url: "https://leetcode.com/problems/daily-temperatures/",
                },
                {
                    title: "Next Greater Element I",
                    url: "https://leetcode.com/problems/next-greater-element-i/",
                },
                {
                    title: "Online Stock Span",
                    url: "https://leetcode.com/problems/online-stock-span/",
                },
            ],
        ),
        createTopic(
            "b5-queues",
            "Queues: array/linked-list implementation and circular queue",
            [
                "https://www.programiz.com/dsa/queue",
                "https://www.geeksforgeeks.org/queue-data-structure/",
                "https://www.geeksforgeeks.org/circular-queue-set-1-introduction-array-implementation/",
            ],
            [
                {
                    title: "Design Circular Queue",
                    url: "https://leetcode.com/problems/design-circular-queue/",
                },
                {
                    title: "Implement Queue using Stacks",
                    url: "https://leetcode.com/problems/implement-queue-using-stacks/",
                },
                {
                    title: "Number of Recent Calls",
                    url: "https://leetcode.com/problems/number-of-recent-calls/",
                },
                {
                    title: "Dota2 Senate",
                    url: "https://leetcode.com/problems/dota2-senate/",
                },
                {
                    title: "Design Front Middle Back Queue",
                    url: "https://leetcode.com/problems/design-front-middle-back-queue/",
                },
                {
                    title: "Time Needed to Buy Tickets",
                    url: "https://leetcode.com/problems/time-needed-to-buy-tickets/",
                },
            ],
        ),
        createTopic(
            "b5-deque-operations-and-sliding-window-maximum",
            "Deque operations and sliding-window maximum",
            [
                "https://www.geeksforgeeks.org/deque-set-1-introduction-applications/",
                "https://www.programiz.com/dsa/deque",
                "https://www.geeksforgeeks.org/sliding-window-maximum-maximum-of-all-subarrays-of-size-k/",
            ],
            [
                {
                    title: "Sliding Window Maximum",
                    url: "https://leetcode.com/problems/sliding-window-maximum/",
                },
                {
                    title: "Design Circular Deque",
                    url: "https://leetcode.com/problems/design-circular-deque/",
                },
                {
                    title: "Reveal Cards In Increasing Order",
                    url: "https://leetcode.com/problems/reveal-cards-in-increasing-order/",
                },
                {
                    title: "Longest Continuous Subarray With Absolute Diff Less Than or Equal to Limit",
                    url: "https://leetcode.com/problems/longest-continuous-subarray-with-absolute-diff-less-than-or-equal-to-limit/",
                },
                {
                    title: "Jump Game VI",
                    url: "https://leetcode.com/problems/jump-game-vi/",
                },
                {
                    title: "Shortest Subarray with Sum at Least K",
                    url: "https://leetcode.com/problems/shortest-subarray-with-sum-at-least-k/",
                },
            ],
        ),
        createTopic(
            "b5-monotonic-stack",
            "Monotonic stacks: increasing and decreasing stacks",
            [
                "https://www.geeksforgeeks.org/introduction-to-monotonic-stack-2/",
                "https://www.geeksforgeeks.org/next-greater-element/",
                "https://leetcode.com/discuss/study-guide/2347639/",
            ],
            [
                {
                    title: "Daily Temperatures",
                    url: "https://leetcode.com/problems/daily-temperatures/",
                },
                {
                    title: "Next Greater Element I",
                    url: "https://leetcode.com/problems/next-greater-element-i/",
                },
                {
                    title: "Next Greater Element II",
                    url: "https://leetcode.com/problems/next-greater-element-ii/",
                },
                {
                    title: "Largest Rectangle in Histogram",
                    url: "https://leetcode.com/problems/largest-rectangle-in-histogram/",
                },
                {
                    title: "Trapping Rain Water",
                    url: "https://leetcode.com/problems/trapping-rain-water/",
                },
                {
                    title: "Sum of Subarray Minimums",
                    url: "https://leetcode.com/problems/sum-of-subarray-minimums/",
                },
            ],
        ),
        createTopic(
            "b5-hare-tortoise",
            "Hare-Tortoise method: slow/fast pointers, cycle detection, cycle start and length",
            [
                "https://www.geeksforgeeks.org/floyds-cycle-finding-algorithm/",
                "https://www.geeksforgeeks.org/detect-loop-in-a-linked-list/",
                "https://leetcode.com/explore/learn/card/linked-list/",
            ],
            [
                {
                    title: "Linked List Cycle",
                    url: "https://leetcode.com/problems/linked-list-cycle/",
                },
                {
                    title: "Linked List Cycle II",
                    url: "https://leetcode.com/problems/linked-list-cycle-ii/",
                },
                {
                    title: "Happy Number",
                    url: "https://leetcode.com/problems/happy-number/",
                },
                {
                    title: "Find the Duplicate Number",
                    url: "https://leetcode.com/problems/find-the-duplicate-number/",
                },
                {
                    title: "Middle of the Linked List",
                    url: "https://leetcode.com/problems/middle-of-the-linked-list/",
                },
                {
                    title: "Palindrome Linked List",
                    url: "https://leetcode.com/problems/palindrome-linked-list/",
                },
            ],
        ),
    ],
};

export default Belt5;
