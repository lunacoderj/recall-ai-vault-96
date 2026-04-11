export interface Record {
  id: string;
  title: string;
  summary: string;
  keyPoints: string[];
  rawContent: string;
  sourceType: "video" | "pdf" | "link" | "note";
  sourceUrl?: string;
  tags: string[];
  createdAt: string;
}

export const mockRecords: Record[] = [
  {
    id: "1",
    title: "Understanding Transformer Architecture in Deep Learning",
    summary: "This resource explains the transformer architecture, including self-attention mechanisms, positional encoding, and how they revolutionized NLP. It covers the original 'Attention Is All You Need' paper and its real-world applications in GPT and BERT models.",
    keyPoints: [
      "Self-attention allows models to weigh different parts of the input",
      "Positional encoding preserves sequence order information",
      "Multi-head attention enables learning different representation subspaces",
      "Transformers replaced RNNs as the dominant NLP architecture",
    ],
    rawContent: "The Transformer model architecture, introduced in the seminal paper 'Attention Is All You Need' by Vaswani et al. (2017), has fundamentally changed the landscape of natural language processing and beyond...",
    sourceType: "link",
    sourceUrl: "https://arxiv.org/abs/1706.03762",
    tags: ["AI", "Deep Learning", "NLP", "Transformers"],
    createdAt: "2024-03-15T10:30:00Z",
  },
  {
    id: "2",
    title: "React 19 New Features and Migration Guide",
    summary: "Comprehensive overview of React 19's new features including the React Compiler, Server Components improvements, Actions, and the new use() hook. Includes step-by-step migration strategies.",
    keyPoints: [
      "React Compiler eliminates need for useMemo and useCallback",
      "Server Components are now stable",
      "Actions simplify form handling and mutations",
      "use() hook for reading resources in render",
    ],
    rawContent: "React 19 brings several groundbreaking features that simplify development patterns...",
    sourceType: "video",
    tags: ["React", "Frontend", "JavaScript", "Web Dev"],
    createdAt: "2024-03-14T14:20:00Z",
  },
  {
    id: "3",
    title: "Remote Internship Opportunities in AI/ML for 2024",
    summary: "A curated list of remote internship opportunities in AI and machine learning from top companies. Covers application timelines, required skills, and preparation tips for technical interviews.",
    keyPoints: [
      "Google, Meta, and OpenAI have early application deadlines",
      "Strong Python and linear algebra skills are essential",
      "Portfolio projects with deployed models stand out",
      "Most programs run May-August with applications closing in February",
    ],
    rawContent: "Finding the right internship in AI/ML can be challenging with so many options...",
    sourceType: "note",
    tags: ["Internships", "AI/ML", "Career", "Remote Work"],
    createdAt: "2024-03-13T09:15:00Z",
  },
  {
    id: "4",
    title: "System Design: Building a Real-Time Chat Application",
    summary: "Detailed system design document covering WebSocket architecture, message queuing, database schema design, and scalability considerations for a production chat application.",
    keyPoints: [
      "WebSockets enable bidirectional real-time communication",
      "Message queues handle high throughput scenarios",
      "Database sharding for horizontal scaling",
      "Redis pub/sub for multi-server message broadcasting",
    ],
    rawContent: "Designing a real-time chat application requires careful consideration of several architectural components...",
    sourceType: "pdf",
    tags: ["System Design", "Architecture", "Backend", "Real-Time"],
    createdAt: "2024-03-12T16:45:00Z",
  },
];
