export interface Project {
  id: string;
  title: string;
  description: string;
  shortDescription: string;
  price: number;
  category: string;
  thumbnail: string;
  screenshots: string[];
  demoVideoUrl?: string;
  features: string[];
  techStack: string[];
  rating: number;
  totalSales: number;
  createdAt: string;
}

export const categories = [
  "Web Development",
  "Mobile App",
  "Machine Learning",
  "Data Science",
  "IoT",
  "Blockchain",
  "Game Development",
  "Desktop App",
];

export const mockProjects: Project[] = [
  {
    id: "1",
    title: "E-Commerce Platform",
    shortDescription: "Full-stack e-commerce solution with payment integration",
    description: "A complete e-commerce platform built with React and Node.js. Features include user authentication, product management, shopping cart, Stripe payment integration, order tracking, and admin dashboard. Perfect for final year projects or startup MVPs.",
    price: 2499,
    category: "Web Development",
    thumbnail: "",
    screenshots: [],
    features: ["User Authentication", "Product Management", "Shopping Cart", "Payment Gateway", "Order Tracking", "Admin Panel"],
    techStack: ["React", "Node.js", "MongoDB", "Stripe", "Tailwind CSS"],
    rating: 4.8,
    totalSales: 156,
    createdAt: "2025-12-15",
  },
  {
    id: "2",
    title: "AI Chatbot System",
    shortDescription: "Intelligent chatbot with NLP capabilities",
    description: "An AI-powered chatbot system built using Python and TensorFlow. Features natural language processing, intent recognition, context management, and multi-platform deployment support.",
    price: 3499,
    category: "Machine Learning",
    thumbnail: "",
    screenshots: [],
    features: ["NLP Processing", "Intent Recognition", "Context Management", "API Integration", "Analytics Dashboard"],
    techStack: ["Python", "TensorFlow", "Flask", "React", "PostgreSQL"],
    rating: 4.6,
    totalSales: 98,
    createdAt: "2025-11-20",
  },
  {
    id: "3",
    title: "Smart Home IoT Dashboard",
    shortDescription: "Control and monitor IoT devices from one dashboard",
    description: "A comprehensive IoT dashboard for smart home automation. Monitor sensors, control devices, set automation rules, and view real-time analytics from a beautiful web interface.",
    price: 1999,
    category: "IoT",
    thumbnail: "",
    screenshots: [],
    features: ["Real-time Monitoring", "Device Control", "Automation Rules", "Data Visualization", "Mobile Responsive"],
    techStack: ["React", "MQTT", "Node.js", "InfluxDB", "Chart.js"],
    rating: 4.5,
    totalSales: 72,
    createdAt: "2026-01-05",
  },
  {
    id: "4",
    title: "Blockchain Voting System",
    shortDescription: "Transparent and secure voting using blockchain",
    description: "A decentralized voting application built on Ethereum blockchain. Ensures transparency, immutability, and security for elections. Includes voter verification and real-time results.",
    price: 4999,
    category: "Blockchain",
    thumbnail: "",
    screenshots: [],
    features: ["Blockchain Security", "Voter Verification", "Real-time Results", "Audit Trail", "Smart Contracts"],
    techStack: ["Solidity", "React", "Web3.js", "Ganache", "MetaMask"],
    rating: 4.9,
    totalSales: 45,
    createdAt: "2026-01-18",
  },
  {
    id: "5",
    title: "Social Media Analytics",
    shortDescription: "Track and analyze social media performance",
    description: "A data science project that collects, analyzes, and visualizes social media data. Features sentiment analysis, trend detection, engagement metrics, and exportable reports.",
    price: 2999,
    category: "Data Science",
    thumbnail: "",
    screenshots: [],
    features: ["Sentiment Analysis", "Trend Detection", "Engagement Metrics", "Custom Reports", "Multi-platform"],
    techStack: ["Python", "Pandas", "Plotly", "FastAPI", "React"],
    rating: 4.7,
    totalSales: 134,
    createdAt: "2025-10-30",
  },
  {
    id: "6",
    title: "Fitness Tracker App",
    shortDescription: "Cross-platform mobile fitness tracking application",
    description: "A feature-rich fitness tracking mobile application built with React Native. Track workouts, calories, set goals, view progress charts, and connect with friends for challenges.",
    price: 3999,
    category: "Mobile App",
    thumbnail: "",
    screenshots: [],
    features: ["Workout Tracking", "Calorie Counter", "Goal Setting", "Progress Charts", "Social Features"],
    techStack: ["React Native", "Firebase", "Redux", "Node.js", "MongoDB"],
    rating: 4.4,
    totalSales: 89,
    createdAt: "2026-01-25",
  },
];
