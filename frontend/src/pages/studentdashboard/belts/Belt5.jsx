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

const Belt5 = {
    id: 5,
    title: "Belt 5",
    subtitle: "Linked Lists, Stacks, Queues and Pointers",
    topics: [
        createTopic(
            "b5-singly-linked-lists",
            "Singly Linked Lists",
            "https://www.geeksforgeeks.org/data-structures/linked-list/",
            leetCodePractice([
                ["Reverse Linked List", "reverse-linked-list"],
                ["Middle of the Linked List", "middle-of-the-linked-list"],
                ["Merge Two Sorted Lists", "merge-two-sorted-lists"],
                ["Remove Linked List Elements", "remove-linked-list-elements"],
                ["Palindrome Linked List", "palindrome-linked-list"],
                ["Intersection of Two Linked Lists", "intersection-of-two-linked-lists"],
            ])
        ),
        createTopic(
            "b5-doubly-circular-linked-lists",
            "Doubly and Circular Linked Lists",
            "https://www.geeksforgeeks.org/doubly-linked-list/",
            leetCodePractice([
                ["Design Linked List", "design-linked-list"],
                ["Flatten a Multilevel Doubly Linked List", "flatten-a-multilevel-doubly-linked-list"],
                ["Insert into a Sorted Circular Linked List", "insert-into-a-sorted-circular-linked-list"],
                ["LRU Cache", "lru-cache"],
                ["Linked List Cycle", "linked-list-cycle"],
                ["Linked List Cycle II", "linked-list-cycle-ii"],
            ])
        ),
        createTopic(
            "b5-stacks",
            "Stacks",
            "https://www.programiz.com/dsa/stack",
            leetCodePractice([
                ["Valid Parentheses", "valid-parentheses"],
                ["Min Stack", "min-stack"],
                ["Evaluate Reverse Polish Notation", "evaluate-reverse-polish-notation"],
                ["Daily Temperatures", "daily-temperatures"],
                ["Simplify Path", "simplify-path"],
                ["Decode String", "decode-string"],
            ])
        ),
        createTopic(
            "b5-queues",
            "Queues",
            "https://www.programiz.com/dsa/queue",
            leetCodePractice([
                ["Implement Queue using Stacks", "implement-queue-using-stacks"],
                ["Number of Recent Calls", "number-of-recent-calls"],
                ["Design Circular Queue", "design-circular-queue"],
                ["Moving Average from Data Stream", "moving-average-from-data-stream"],
                ["Data Stream", "data-stream"],
                ["Rotting Oranges", "rotting-oranges"],
            ])
        ),
        createTopic(
            "b5-monotonic-stack",
            "Monotonic Stack",
            "https://www.geeksforgeeks.org/introduction-to-monotonic-stack-data-structure-and-algorithm-tutorials/",
            leetCodePractice([
                ["Daily Temperatures", "daily-temperatures"],
                ["Next Greater Element I", "next-greater-element-i"],
                ["Next Greater Element II", "next-greater-element-ii"],
                ["Largest Rectangle in Histogram", "largest-rectangle-in-histogram"],
                ["Online Stock Span", "online-stock-span"],
                ["Sum of Subarray Minimums", "sum-of-subarray-minimums"],
            ])
        ),
        createTopic(
            "b5-two-pointer",
            "Two-Pointer Technique",
            "https://www.geeksforgeeks.org/two-pointers-technique/",
            leetCodePractice([
                ["Two Sum II - Input Array Is Sorted", "two-sum-ii-input-array-is-sorted"],
                ["Valid Palindrome", "valid-palindrome"],
                ["3Sum", "3sum"],
                ["Container With Most Water", "container-with-most-water"],
                ["Remove Duplicates from Sorted Array", "remove-duplicates-from-sorted-array"],
                ["Squares of a Sorted Array", "squares-of-a-sorted-array"],
            ])
        ),
        createTopic(
            "b5-hare-tortoise",
            "Hare-Tortoise / Slow-Fast Pointers",
            "https://www.geeksforgeeks.org/floyds-cycle-finding-algorithm/",
            leetCodePractice([
                ["Linked List Cycle", "linked-list-cycle"],
                ["Linked List Cycle II", "linked-list-cycle-ii"],
                ["Middle of the Linked List", "middle-of-the-linked-list"],
                ["Happy Number", "happy-number"],
                ["Palindrome Linked List", "palindrome-linked-list"],
                ["Find the Duplicate Number", "find-the-duplicate-number"],
            ])
        ),
    ],
};

export default Belt5;
