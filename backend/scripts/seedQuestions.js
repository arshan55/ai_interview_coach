require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const QuestionBank = require('../models/QuestionBank');

const questions = [
  // =========================================
  // SOFTWARE ENGINEER
  // =========================================
  { title: "Valid Parentheses", difficulty: "easy", topic: "Stacks", role: "software-engineer", isCodingProblem: true,
    questionText: "[CODING_PROBLEM] Given a string `s` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid. An input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.\n\nExample: Input: s = \"()[]{}\" → Output: true\nExample: Input: s = \"(]\" → Output: false" },
  { title: "Reverse a Linked List", difficulty: "easy", topic: "Linked Lists", role: "software-engineer", isCodingProblem: true,
    questionText: "[CODING_PROBLEM] Given the head of a singly linked list, reverse the list, and return the reversed list.\n\nExample:\nInput: head = [1,2,3,4,5]\nOutput: [5,4,3,2,1]" },
  { title: "Maximum Depth of Binary Tree", difficulty: "easy", topic: "Trees", role: "software-engineer", isCodingProblem: true,
    questionText: "[CODING_PROBLEM] Given the root of a binary tree, return its maximum depth. The maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.\n\nExample:\nInput: root = [3,9,20,null,null,15,7]\nOutput: 3" },
  { title: "Longest Substring Without Repeating Characters", difficulty: "medium", topic: "Strings", role: "software-engineer", isCodingProblem: true,
    questionText: "[CODING_PROBLEM] Given a string `s`, find the length of the longest substring without repeating characters.\n\nExample:\nInput: s = \"abcabcbb\"\nOutput: 3\nExplanation: The answer is \"abc\", with the length of 3." },
  { title: "Binary Search", difficulty: "easy", topic: "Searching", role: "software-engineer", isCodingProblem: true,
    questionText: "[CODING_PROBLEM] Given an array of integers `nums` which is sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists, return its index. Otherwise, return -1. You must write an algorithm with O(log n) runtime complexity.\n\nExample:\nInput: nums = [-1,0,3,5,9,12], target = 9\nOutput: 4" },
  { title: "Number of Islands", difficulty: "medium", topic: "Graphs", role: "software-engineer", isCodingProblem: true,
    questionText: "[CODING_PROBLEM] Given an m x n 2D binary grid which represents a map of '1's (land) and '0's (water), return the number of islands. An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.\n\nExample:\nInput: grid = [[\"1\",\"1\",\"0\"],[\"1\",\"1\",\"0\"],[\"0\",\"0\",\"1\"]]\nOutput: 2" },
  { title: "Coin Change", difficulty: "medium", topic: "Dynamic Programming", role: "software-engineer", isCodingProblem: true,
    questionText: "[CODING_PROBLEM] You are given an integer array `coins` representing coins of various denominations and an integer `amount` representing a total amount of money. Return the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return -1.\n\nExample:\nInput: coins = [1,5,11], amount = 15\nOutput: 3" },
  { title: "Design a Cache Eviction Policy", difficulty: "hard", topic: "System Design", role: "software-engineer", isCodingProblem: false,
    questionText: "Design a multi-tier caching system for a high-traffic web application. Describe the cache hierarchy (L1/L2/distributed), which eviction policies you would choose (LRU, LFU, or ARC) and why, how you handle cache invalidation on write operations, and how to prevent cache stampede under sudden load spikes." },
  { title: "Serialize and Deserialize Binary Tree", difficulty: "hard", topic: "Trees", role: "software-engineer", isCodingProblem: true,
    questionText: "[CODING_PROBLEM] Design an algorithm to serialize and deserialize a binary tree. Serialization is the process of converting a data structure to a sequence of bits so that it can be stored in a file or memory buffer and later reconstructed. Implement the serialize and deserialize methods, and explain the traversal strategy you choose." },
  { title: "Find Median from Data Stream", difficulty: "hard", topic: "Heaps", role: "software-engineer", isCodingProblem: true,
    questionText: "[CODING_PROBLEM] The median is the middle value in an ordered integer list. If the size of the list is even, there is no middle value, and the median is the mean of the two middle values.\n\nImplement the `MedianFinder` class:\n- `addNum(int num)` — adds the integer to the data structure.\n- `findMedian()` — returns the median of all elements so far.\n\nAim for O(log n) add and O(1) find." },

  // =========================================
  // BACKEND DEVELOPER
  // =========================================
  { title: "Two Sum", difficulty: "easy", topic: "Arrays", role: "backend-developer", isCodingProblem: true,
    questionText: "[CODING_PROBLEM] Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution. You may not use the same element twice.\n\nExample:\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]" },
  { title: "RESTful API Design Principles", difficulty: "easy", topic: "API Design", role: "backend-developer", isCodingProblem: false,
    questionText: "Explain the six constraints of RESTful architecture (Stateless, Uniform Interface, Layered System, etc.). How do you version REST APIs without breaking existing clients? Describe the difference between a 400, 401, 403, 404, and 429 HTTP status code and when to return each." },
  { title: "Database Indexing Strategies", difficulty: "easy", topic: "Databases", role: "backend-developer", isCodingProblem: false,
    questionText: "Explain how B-Tree and Hash indexes work internally in a relational database. When would you create a composite index versus a single-column index? What are covering indexes? What is an index scan vs. a full table scan and how do you diagnose which one is being used?" },
  { title: "Longest Substring Without Repeating Characters", difficulty: "medium", topic: "Strings", role: "backend-developer", isCodingProblem: true,
    questionText: "[CODING_PROBLEM] Given a string `s`, find the length of the longest substring without repeating characters.\n\nExample:\nInput: s = \"abcabcbb\"\nOutput: 3\nExplanation: The answer is \"abc\", with the length of 3." },
  { title: "LRU Cache", difficulty: "medium", topic: "Data Structures", role: "backend-developer", isCodingProblem: true,
    questionText: "[CODING_PROBLEM] Design a data structure that follows the constraints of a Least Recently Used (LRU) cache.\n\nImplement the `LRUCache` class:\n- `LRUCache(int capacity)` Initialize the LRU cache with positive size capacity.\n- `int get(int key)` Return the value of the key if the key exists, otherwise return -1.\n- `void put(int key, int value)` Update the value of the key if the key exists. Otherwise, add the key-value pair to the cache. If the number of keys exceeds the capacity, evict the least recently used key.\n\nThe functions `get` and `put` must run in O(1) average time complexity." },
  { title: "Design a URL Shortener", difficulty: "medium", topic: "System Design", role: "backend-developer", isCodingProblem: false,
    questionText: "How would you design a system like TinyURL that generates short aliases for long URLs? Explain the API endpoints, database schema, URL generation mechanism (hashing vs. key-generation service), and how to handle high-concurrency redirect traffic." },
  { title: "Merge k Sorted Lists", difficulty: "hard", topic: "Algorithms", role: "backend-developer", isCodingProblem: true,
    questionText: "[CODING_PROBLEM] You are given an array of `k` linked-lists, each sorted in ascending order. Merge all the linked-lists into one sorted linked-list and return it.\n\nExample:\nInput: lists = [[1,4,5],[1,3,4],[2,6]]\nOutput: [1,1,2,3,4,4,5,6]" },
  { title: "Design a Distributed Rate Limiter", difficulty: "hard", topic: "Distributed Systems", role: "backend-developer", isCodingProblem: false,
    questionText: "Design a distributed rate limiter that can handle millions of requests per second across a global server fleet. Discuss rate limiting algorithms (Token Bucket, Leaky Bucket, Sliding Window Log), how you would share state between servers (e.g. Redis), concurrency race conditions, and fail-safe routing if the rate limiting service fails." },
  { title: "Optimize a Slow SQL Query", difficulty: "hard", topic: "Databases", role: "backend-developer", isCodingProblem: false,
    questionText: "You have a SQL query joining 5 tables with multiple WHERE filters that is taking 30 seconds to execute on a 50 million row table. Walk through your complete debugging process: how do you use EXPLAIN ANALYZE, which indexes you would create (and why), whether denormalization or materialized views apply, and how you test the fix." },

  // =========================================
  // FRONTEND DEVELOPER
  // =========================================
  { title: "Implement Array.prototype.filter", difficulty: "easy", topic: "JavaScript Engine", role: "frontend-developer", isCodingProblem: true,
    questionText: "[CODING_PROBLEM] Write a custom implementation of `Array.prototype.filter` in pure JavaScript/TypeScript without using the built-in `.filter()` method. Your function should accept a callback function and an optional `thisArg`, and execute the callback for each element of the array, returning a new array containing all elements that passed the test." },
  { title: "CSS Specificity and Cascade", difficulty: "easy", topic: "CSS Fundamentals", role: "frontend-developer", isCodingProblem: false,
    questionText: "Explain CSS specificity. How is specificity calculated for an element with classes, IDs, inline styles, and pseudo-classes? What is the cascade order? Give a concrete example where two rules conflict and explain which one wins and why." },
  { title: "Browser Rendering Pipeline", difficulty: "easy", topic: "Browser Performance", role: "frontend-developer", isCodingProblem: false,
    questionText: "Describe the browser's complete rendering pipeline from HTML bytes to pixels on screen. What happens during parsing, DOM construction, CSSOM construction, rendering tree, layout, paint, and compositing? What causes reflow vs. repaint and how can you minimize them?" },
  { title: "Debounce Function", difficulty: "medium", topic: "JavaScript Utility", role: "frontend-developer", isCodingProblem: true,
    questionText: "[CODING_PROBLEM] Implement a `debounce` function in JavaScript. A debounced function delays the execution of the target function until after `wait` milliseconds have elapsed since the last time the debounced function was invoked. Support an optional `options` object with a `leading` boundary and/or `trailing` boundary execution." },
  { title: "React State Management Patterns", difficulty: "medium", topic: "React Architecture", role: "frontend-developer", isCodingProblem: false,
    questionText: "Compare the following React state management approaches: Context API, Redux Toolkit, Zustand, and React Query. When would you choose each one? Explain the concept of derived state, why normalizing state shape matters, and how to avoid excessive re-renders caused by context updates." },
  { title: "Design a Virtualized List Component", difficulty: "medium", topic: "React Performance", role: "frontend-developer", isCodingProblem: false,
    questionText: "Explain how you would design a Virtualized List component (like react-window) in React to render a list of 100,000 items efficiently. Explain how scroll events are handled, how visible items are calculated, absolute positioning of rows, and how you prevent browser reflow and layout thrashing." },
  { title: "Implement a Custom Promise Library", difficulty: "hard", topic: "Asynchronous JS", role: "frontend-developer", isCodingProblem: true,
    questionText: "[CODING_PROBLEM] Implement a simplified version of the ES6 `Promise` class in JavaScript. Your custom class should support instantiation with an executor function (having `resolve` and `reject` arguments), support chainable `.then(onFulfilled, onRejected)` calls, and correctly handle asynchronous code execution." },
  { title: "Design a Micro-Frontend Architecture", difficulty: "hard", topic: "Frontend Architecture", role: "frontend-developer", isCodingProblem: false,
    questionText: "You are asked to split a large monolithic React application into micro-frontends for independent deployment by different teams. Explain your chosen integration strategy (Module Federation, iframes, or Web Components), how you handle shared state and authentication between micro-frontends, how you manage shared dependencies without duplication, and the CI/CD pipeline for independent deployment." },
  { title: "Implement Event Emitter", difficulty: "hard", topic: "Design Patterns", role: "frontend-developer", isCodingProblem: true,
    questionText: "[CODING_PROBLEM] Implement a custom `EventEmitter` class in JavaScript with the following methods:\n- `on(event, listener)` — subscribe to an event.\n- `off(event, listener)` — unsubscribe from an event.\n- `emit(event, ...args)` — fire an event passing arguments to all listeners.\n- `once(event, listener)` — subscribe to an event but automatically unsubscribe after it fires once.\n\nHandle edge cases such as emitting an event with no listeners." },

  // =========================================
  // DEVOPS ENGINEER
  // =========================================
  { title: "Bash Log Analyzer", difficulty: "easy", topic: "Scripting & Linux", role: "devops-engineer", isCodingProblem: true,
    questionText: "[CODING_PROBLEM] Write a Bash script that reads a web server access log file (passed as an argument), extracts all IP addresses that received an HTTP 500 error, counts the occurrences of each IP address, and prints the top 5 offending IP addresses in descending order of frequency." },
  { title: "Linux Process Management", difficulty: "easy", topic: "Linux Administration", role: "devops-engineer", isCodingProblem: false,
    questionText: "Explain the difference between a process and a thread in Linux. How do you use `ps`, `top`, `htop`, and `strace` to diagnose a process consuming 100% CPU? What is a zombie process and how do you clean it up? Explain how signals (SIGKILL vs. SIGTERM) differ." },
  { title: "Docker Multi-Stage Builds", difficulty: "easy", topic: "Containerization", role: "devops-engineer", isCodingProblem: false,
    questionText: "Explain Docker multi-stage builds and why they are critical for production images. How do you minimize the size of a Node.js Docker image? What is the difference between `COPY` and `ADD`? Explain how Docker layer caching works and how to order Dockerfile commands to maximize cache hits during CI builds." },
  { title: "Zero-Downtime Deployment Pipeline", difficulty: "medium", topic: "CI/CD & K8s", role: "devops-engineer", isCodingProblem: false,
    questionText: "Design a secure, automated CI/CD pipeline using GitHub Actions and Kubernetes to deploy a Node.js microservice with zero downtime. Explain how you implement Canary or Blue-Green deployments, run health checks (liveness/readiness probes), handle secrets securely, and configure rolling updates." },
  { title: "Kubernetes Troubleshooting", difficulty: "medium", topic: "Kubernetes Operations", role: "devops-engineer", isCodingProblem: false,
    questionText: "A Kubernetes pod is stuck in a CrashLoopBackOff state. Walk through your complete step-by-step debugging process using `kubectl` commands (`logs`, `describe`, `exec`, `events`). What are the most common causes of CrashLoopBackOff and how do you fix each one?" },
  { title: "Infrastructure as Code with Terraform", difficulty: "medium", topic: "Infrastructure Automation", role: "devops-engineer", isCodingProblem: false,
    questionText: "Explain how Terraform manages infrastructure state. What is `terraform state` and why is storing state remotely (e.g., S3 with DynamoDB locking) important for teams? What is the difference between `terraform plan`, `apply`, and `destroy`? How do you handle secrets in Terraform without committing them to source control?" },
  { title: "Multi-Region Disaster Recovery", difficulty: "hard", topic: "Cloud Architecture", role: "devops-engineer", isCodingProblem: false,
    questionText: "Design a multi-region disaster recovery architecture for a high-traffic e-commerce platform on AWS or GCP. Detail your strategy for database replication (active-active vs active-passive), DNS failover routing, target recovery metrics (RPO/RTO), and how you use Terraform to quickly rebuild identical infrastructure in a secondary region." },
  { title: "Observability Stack Design", difficulty: "hard", topic: "Monitoring & Observability", role: "devops-engineer", isCodingProblem: false,
    questionText: "Design a comprehensive observability stack (Logs, Metrics, Traces) for a microservices application running on Kubernetes. Which tools would you choose (Prometheus, Grafana, Loki, Jaeger, OpenTelemetry)? How do you implement distributed tracing across services? What SLOs/SLAs would you define and how do you alert on them?" },
  { title: "Secure Secrets Management", difficulty: "hard", topic: "Security & Compliance", role: "devops-engineer", isCodingProblem: false,
    questionText: "Design a secrets management strategy for a Kubernetes cluster running in production. Compare Kubernetes Secrets, HashiCorp Vault, AWS Secrets Manager, and GCP Secret Manager. How do you rotate secrets without downtime? How do you audit secret access? What is the principle of least privilege and how do you enforce it using RBAC?" },

  // =========================================
  // DATA SCIENTIST
  // =========================================
  { title: "Bias-Variance Trade-off", difficulty: "easy", topic: "ML Fundamentals", role: "data-scientist", isCodingProblem: false,
    questionText: "Explain the concept of Bias-Variance Trade-off in Machine Learning. How do high bias and high variance manifest themselves in training vs. validation losses? Provide two practical techniques to reduce bias, and two techniques to reduce variance in a model." },
  { title: "Supervised vs. Unsupervised Learning", difficulty: "easy", topic: "ML Concepts", role: "data-scientist", isCodingProblem: false,
    questionText: "Explain the difference between supervised, unsupervised, and semi-supervised learning with real-world examples of each. When would you use k-means clustering vs. DBSCAN? What is the difference between classification and regression, and how do you choose the right loss function for each?" },
  { title: "Feature Engineering Techniques", difficulty: "easy", topic: "Data Preprocessing", role: "data-scientist", isCodingProblem: false,
    questionText: "You have a dataset with missing values, categorical variables, and highly skewed numerical features. Walk through your complete feature preprocessing pipeline: how do you impute missing data, encode categoricals (One-Hot vs. Label Encoding vs. Target Encoding), handle skewness (log transform vs. Box-Cox), and detect/treat outliers." },
  { title: "Handling Class Imbalance", difficulty: "medium", topic: "Data Engineering", role: "data-scientist", isCodingProblem: false,
    questionText: "You are building a fraud detection model where only 0.1% of transactions are fraudulent (severe class imbalance). Describe how you would handle this imbalance at: 1) the data level (sampling techniques), 2) the model level (loss functions), and 3) the evaluation metric level (which metrics to track instead of accuracy)." },
  { title: "A/B Testing Statistical Design", difficulty: "medium", topic: "Experimentation", role: "data-scientist", isCodingProblem: false,
    questionText: "You want to run an A/B test for a new checkout flow on an e-commerce site. Explain how you calculate the required sample size, what statistical power and significance level to choose, how you handle multiple testing problems (Bonferroni correction), when to stop the experiment early, and how to interpret the results correctly." },
  { title: "Gradient Boosting Deep Dive", difficulty: "medium", topic: "ML Algorithms", role: "data-scientist", isCodingProblem: false,
    questionText: "Explain how Gradient Boosting builds an ensemble of weak learners step by step. What is the difference between XGBoost and LightGBM? Explain key hyperparameters (n_estimators, learning_rate, max_depth, subsample, min_child_weight) and how you tune them. What are the main differences between Gradient Boosting and Random Forest?" },
  { title: "Real-Time Recommendation System", difficulty: "hard", topic: "ML Systems Design", role: "data-scientist", isCodingProblem: false,
    questionText: "Design the end-to-end architecture of an online real-time Recommendation System (e.g., Netflix home feed). Explain the two main stages (Candidate Generation/Retrieval and Ranking), how you incorporate user embeddings, what machine learning models are used, and how you evaluate recommendation quality both offline and online (A/B testing)." },
  { title: "Diagnosing a Failing ML Pipeline", difficulty: "hard", topic: "MLOps", role: "data-scientist", isCodingProblem: false,
    questionText: "Your ML model achieved 92% accuracy in offline evaluation but dropped to 78% accuracy one month after deployment in production. Walk through your complete diagnosis: how do you detect data drift vs. concept drift, what monitoring metrics you track in production, how you retrain and validate before redeploying, and what MLOps tooling (MLflow, Kubeflow, etc.) you would use." },
  { title: "Transformer Architecture", difficulty: "hard", topic: "Deep Learning", role: "data-scientist", isCodingProblem: false,
    questionText: "Explain the Transformer architecture from scratch. Describe the role of multi-head self-attention, positional encoding, feed-forward layers, layer normalization, and the encoder-decoder structure. Why did Transformers replace RNNs/LSTMs for sequence modeling? What are the limitations of Transformers (e.g. quadratic attention complexity) and how are they addressed?" },

  // =========================================
  // PRODUCT MANAGER
  // =========================================
  { title: "Ride-Sharing Feature Prioritization", difficulty: "easy", topic: "Product Strategy", role: "product-manager", isCodingProblem: false,
    questionText: "You are the Lead PM for a ride-sharing app with a backlog of 20 features including 'scheduled rides', 'split fare', and 'wheelchair accessibility'. Explain which prioritization framework (e.g., RICE, Kano Model) you would use to filter these features, and walk through how you would evaluate and launch the 'scheduled rides' feature." },
  { title: "Product Metrics Definition", difficulty: "easy", topic: "Product Metrics", role: "product-manager", isCodingProblem: false,
    questionText: "You are PM for a new B2B SaaS product. Define the North Star Metric for the product and explain why you chose it. Define 3 input metrics that drive the North Star, and 2 guardrail metrics you would watch. How do you distinguish between a vanity metric and an actionable metric?" },
  { title: "Customer Discovery Interview", difficulty: "easy", topic: "User Research", role: "product-manager", isCodingProblem: false,
    questionText: "You are tasked with validating a new product idea: a mobile app for freelancers to automate their invoicing. Walk through how you would conduct a discovery interview. What 5 open-ended questions would you ask? How do you avoid confirmation bias? What patterns in responses would indicate a real problem worth solving?" },
  { title: "E-Commerce User Retention", difficulty: "medium", topic: "Product Design", role: "product-manager", isCodingProblem: false,
    questionText: "Identify the key drivers of churn for a mid-sized clothing e-commerce app. Design a product feature or experience aimed at increasing the 30-day user retention rate by 5%. Detail your hypothesis, feature workflow, target cohort, and how you would design an A/B test to validate success." },
  { title: "Go-to-Market Strategy", difficulty: "medium", topic: "Product Launch", role: "product-manager", isCodingProblem: false,
    questionText: "You are about to launch a new productivity app for remote teams that competes directly with Notion and Confluence. Describe your go-to-market strategy from scratch: target customer segment, ICP definition, pricing model decision, launch channels (Product Hunt, content marketing, enterprise sales), and the metrics you will track in the first 90 days." },
  { title: "Product Roadmap for an AI Feature", difficulty: "medium", topic: "Roadmap Planning", role: "product-manager", isCodingProblem: false,
    questionText: "You are the PM responsible for adding an AI-powered writing assistant to your company's email platform (like Gmail). How do you build the product roadmap for a 6-month horizon? Define the user stories, break them into milestones (MVP vs. iterative releases), explain how you handle model accuracy concerns, and how you get engineering buy-in on timelines." },
  { title: "Maps Integration Metrics", difficulty: "hard", topic: "Analytical Thinking", role: "product-manager", isCodingProblem: false,
    questionText: "Your food delivery platform recently integrated a new real-time driver tracking map. How would you measure the success of this integration? Define your North Star metric, key engagement metrics, counter-metrics to watch, and how you would diagnose a post-launch conversion rate drop." },
  { title: "Monetization Strategy Design", difficulty: "hard", topic: "Business Strategy", role: "product-manager", isCodingProblem: false,
    questionText: "Your company's free-tier communication tool has 10 million active users but minimal revenue. You are tasked with designing a monetization strategy without driving user churn. Compare freemium, usage-based pricing, seat-based SaaS, and enterprise tier models for this product. Which would you choose and why? How do you validate pricing before full launch?" },
  { title: "Crisis Management: Product Outage", difficulty: "hard", topic: "Stakeholder Management", role: "product-manager", isCodingProblem: false,
    questionText: "Your company's flagship payment processing feature went down for 4 hours during peak Black Friday traffic. You are the PM on call. Walk through your complete incident response: how do you communicate to customers, stakeholders, and the press? How do you coordinate with engineering without micromanaging? What is your post-incident review process and how do you prevent recurrence?" }
];

const seedDB = async () => {
  const dbUri = process.env.MONGODB_URI;
  if (!dbUri) {
    console.error("MONGODB_URI is not set in the environment variables!");
    process.exit(1);
  }

  try {
    console.log("Connecting to MongoDB for seeding...");
    await mongoose.connect(dbUri);
    console.log("Connected to MongoDB.");

    console.log("Clearing existing questions in QuestionBank...");
    await QuestionBank.deleteMany({});
    console.log("Cleared old questions.");

    console.log(`Inserting ${questions.length} questions into QuestionBank...`);
    const inserted = await QuestionBank.insertMany(questions);
    console.log(`Successfully seeded ${inserted.length} questions into the database.`);

    // Print summary per role/difficulty
    const roles = [...new Set(questions.map(q => q.role))];
    console.log("\n=== Seeded Question Summary ===");
    for (const role of roles) {
      const forRole = questions.filter(q => q.role === role);
      const easy = forRole.filter(q => q.difficulty === 'easy').length;
      const medium = forRole.filter(q => q.difficulty === 'medium').length;
      const hard = forRole.filter(q => q.difficulty === 'hard').length;
      console.log(`  ${role}: ${forRole.length} total | easy=${easy} medium=${medium} hard=${hard}`);
    }

    mongoose.connection.close();
    console.log("\nDatabase connection closed. Seeding complete!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
};

seedDB();
