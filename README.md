# 🧠 LitGraph AI - Research Literature Knowledge Graph

A sophisticated Graph-RAG system that extracts knowledge graphs from research papers and enables intelligent querying through AI-powered reasoning.

![LitGraph AI](https://img.shields.io/badge/LitGraph-AI-blue?style=for-the-badge)
![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-18-green?style=for-the-badge&logo=node.js)
![Gemini API](https://img.shields.io/badge/Gemini-API-purple?style=for-the-badge&logo=google)

## ✨ Features

- 📄 **PDF Upload & Text Extraction** - Process research papers with automatic text extraction
- 🕸️ **Knowledge Graph Extraction** - AI-powered entity and relationship identification
- 🎨 **Interactive Visualization** - D3.js force-directed graph with zoom, pan, and drag
- 💬 **Graph-Aware Q&A** - Intelligent chat with reasoning traces
- 🎯 **Modern UI** - Dark theme with responsive design
- 🔍 **Entity Types** - Papers, Authors, Concepts, Methods, Results, Datasets, Problems

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Google Gemini API key

### Installation
```bash
git clone https://github.com/yourusername/litgraph-ai.git
cd litgraph-ai
npm install

# Setup frontend
cd client && npm install

# Setup backend  
cd ../server && npm install
```

### Environment Setup
Create `.env` in `server/`:
```env
GOOGLE_API_KEY=your_gemini_api_key
PORT=3000
```

### Run Development Servers
```bash
# Terminal 1 - Backend
cd server && npm run dev

# Terminal 2 - Frontend
cd client && npm run dev
```

Access at http://localhost:5173

## 📖 Usage

1. **Upload PDF**: Drag and drop research papers or paste text
2. **Explore Graph**: Navigate the interactive knowledge graph
3. **Ask Questions**: Query the graph with AI-powered reasoning

## 🏗️ Architecture

```
Frontend (React) ←→ Backend (Express) ←→ AI Service (Gemini API)
     ↓                    ↓                      ↓
PDF Processing      Graph Storage        Knowledge Extraction
Graph Viz          API Routes           Question Answering
Chat Interface     Data Persistence     Reasoning Traces
```

## 📁 Project Structure

```
litgraph-ai/
├── client/                 # React frontend
│   ├── components/        # UI components
│   ├── services/         # API services
│   ├── graph/            # Graph visualization
│   └── ingestion/        # PDF upload & text input
├── server/               # Express backend
│   ├── server.ts         # Main server
│   └── graph_db.json     # Graph storage
├── README.md            # Documentation
└── LICENSE              # MIT License
```

## 🔌 API

- `GET /api/graph` - Retrieve knowledge graph
- `POST /api/graph/extract` - Extract graph from text
- `POST /api/graph/query` - Query with AI reasoning
- `POST /api/graph/clear` - Clear graph data

## 🛠️ Tech Stack

**Frontend**: React, TypeScript, Vite, TailwindCSS, D3.js, PDF.js  
**Backend**: Node.js, Express, TypeScript  
**AI**: Google Gemini API, Graph-RAG

## � License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🙏 Acknowledgments

- Google Gemini API for AI-powered analysis
- D3.js for interactive visualizations
- PDF.js for text extraction

---

**Built with ❤️ for research literature analysis**

## 🌟 Features

### 📄 PDF Processing
- **PDF Upload**: Drag-and-drop or select research paper PDFs
- **Text Extraction**: Automatic text extraction using PDF.js
- **File Validation**: Size limits (10MB) and format checking
- **Error Handling**: User-friendly error messages

### 🕸️ Knowledge Graph
- **Entity Extraction**: AI-powered identification of research entities
- **Relationship Mapping**: Automatic relationship detection between entities
- **Node Types**: Papers, Authors, Concepts, Methods, Results, Datasets, Problems
- **Graph Persistence**: Durable storage in JSON format

### 🎨 Interactive Visualization
- **Force-Directed Graph**: D3.js powered interactive graph visualization
- **Zoom & Pan**: Smooth navigation through large graphs
- **Node Inspection**: Click nodes to view detailed information
- **Color Coding**: Visual distinction by entity type
- **Drag & Drop**: Reposition nodes for better layout

### 💬 Intelligent Chat
- **Graph-Aware Q&A**: Questions answered using knowledge graph context
- **Reasoning Traces**: Visual path showing how answers were derived
- **Contextual Responses**: AI considers graph relationships in answers

### 🎯 User Interface
- **Modern Design**: Dark theme with blue accents
- **Responsive Layout**: Works on different screen sizes
- **Three-View System**: Input, Graph, and Chat views
- **Real-time Updates**: Live graph statistics and loading states

## 🏗️ Architecture

### High-Level Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   AI Service    │
│   (React)       │◄──►│   (Express)     │◄──►│   (Gemini API)  │
│                 │    │                 │    │                 │
│ • PDF Upload    │    │ • API Routes    │    │ • Text Analysis │
│ • Graph Viz     │    │ • Graph Storage │    │ • Knowledge    │
│ • Chat Interface│    │ • Data Processing│    │   Extraction    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack

#### Frontend
- **React 19** - Modern UI framework with hooks
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **TailwindCSS** - Utility-first CSS framework
- **D3.js** - Data visualization for graphs
- **PDF.js** - PDF text extraction
- **Lucide React** - Modern icon library

#### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **TypeScript** - Type-safe development
- **Google Generative AI** - Gemini API integration
- **File System** - JSON-based graph persistence

#### AI/ML
- **Google Gemini Pro** - Large language model
- **Graph-RAG** - Retrieval-augmented generation
- **Knowledge Graph Extraction** - Entity and relationship parsing

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Google Gemini API key

### 1. Clone and Install
```bash
git clone <repository-url>
cd Graph-RAG
npm install
cd client && npm install
cd ../server && npm install
```

### 2. Environment Setup
Create `.env` file in server directory:
```env
GOOGLE_API_KEY=your_gemini_api_key_here
PORT=3000
```

### 3. Start Development
```bash
# Terminal 1 - Start Backend
cd server
npm run dev

# Terminal 2 - Start Frontend  
cd client
npm run dev
```

### 4. Access Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## 📁 Project Structure

```
Graph-RAG/
├── client/                 # React frontend
│   ├── components/        # Reusable UI components
│   │   └── GraphCanvas.tsx    # D3.js graph visualization
│   ├── graph/            # Graph-related components
│   │   ├── GraphWorkspace.tsx # Main graph view
│   │   └── NodeInspector.tsx # Node details panel
│   ├── ingestion/        # Text input components
│   │   └── IngestionPanel.tsx # PDF upload & text input
│   ├── chat/            # Chat interface
│   │   └── ChatPanel.tsx     # Q&A interface
│   ├── layout/          # Layout components
│   │   ├── Header.tsx       # App header
│   │   └── Sidebar.tsx      # Navigation sidebar
│   ├── services/        # API services
│   │   ├── geminiService.ts # Backend API calls
│   │   └── pdfService.ts    # PDF processing
│   ├── types.ts         # TypeScript type definitions
│   ├── App.tsx          # Main application component
│   └── index.tsx        # Application entry point
├── server/               # Express backend
│   ├── server.ts        # Main server file
│   ├── graph_db.json    # Graph data storage
│   └── package.json     # Backend dependencies
└── README.md           # This file
```

## 🔧 Installation

### Frontend Dependencies
```bash
cd client
npm install react react-dom typescript
npm install vite @vitejs/plugin-react
npm install tailwindcss postcss autoprefixer
npm install d3 @types/d3
npm install lucide-react
npm install pdfjs-dist
```

### Backend Dependencies
```bash
cd server  
npm install express cors dotenv
npm install @google/generative-ai
npm install typescript @types/node @types/express
npm install ts-node nodemon
```

## 💻 Usage

### 1. Upload Research Paper
- Navigate to the Input view (default)
- Click "Choose PDF" to upload a research paper
- Or paste text directly into the textarea
- Click "Update Graph" to process the text

### 2. Explore Knowledge Graph
- Switch to Graph view using the sidebar
- Interact with the visualization:
  - **Scroll**: Zoom in/out
  - **Drag**: Move nodes around
  - **Click**: Select nodes to view details
  - **Pan**: Click and drag background

### 3. Ask Questions
- Switch to Chat view
- Type questions about the research content
- View AI responses with reasoning traces
- Example questions:
  - "What methods were used in these papers?"
  - "Who are the main authors?"
  - "What concepts are related to machine learning?"

## 🔌 API Documentation

### Graph Endpoints

#### GET /api/graph
Retrieve current knowledge graph data.

**Response:**
```json
{
  "nodes": [
    {
      "id": "node1",
      "label": "Machine Learning",
      "type": "Concept",
      "description": "A field of AI..."
    }
  ],
  "links": [
    {
      "source": "node1",
      "target": "node2", 
      "relationship": "uses"
    }
  ]
}
```

#### POST /api/graph/extract
Extract knowledge graph from text.

**Request:**
```json
{
  "text": "Research paper content..."
}
```

#### POST /api/graph/query
Query the knowledge graph with AI reasoning.

**Request:**
```json
{
  "query": "What methods are used?",
  "graph": { /* current graph data */ }
}
```

**Response:**
```json
{
  "text": "The papers use several methods including...",
  "reasoningTrace": ["node1", "node2", "node3"]
}
```

#### POST /api/graph/clear
Clear all graph data.

## 🧠 How It Works

### 1. Text Processing Pipeline
```
PDF/Text Input → Text Extraction → AI Analysis → Graph Generation
```

1. **PDF Processing**: PDF.js extracts raw text from uploaded files
2. **AI Analysis**: Gemini API identifies entities and relationships
3. **Graph Generation**: Structured nodes and links are created
4. **Storage**: Graph data persists in JSON format

### 2. Knowledge Graph Structure
- **Nodes**: Research entities (papers, authors, concepts, etc.)
- **Links**: Relationships between entities
- **Types**: Categorization for better organization
- **Metadata**: Additional information for context

### 3. Query Processing
```
User Question → Graph Context → AI Reasoning → Answer + Trace
```

1. **Question Analysis**: Understand user intent
2. **Graph Context**: Include relevant graph structure
3. **AI Reasoning**: Gemini processes with graph awareness
4. **Response Generation**: Answer with reasoning path

## 🎨 UI Components

### IngestionPanel
- **PDF Upload**: Drag-and-drop file interface
- **Text Input**: Large textarea for manual text entry
- **Loading States**: Visual feedback during processing
- **Error Handling**: User-friendly error messages

### GraphCanvas
- **D3.js Visualization**: Force-directed graph layout
- **Interactive Controls**: Zoom, pan, drag functionality
- **Node Styling**: Color-coded by entity type
- **Link Labels**: Relationship type display
- **Event Handling**: Click events for node selection

### ChatPanel
- **Message History**: Conversation display
- **Input Interface**: Question submission
- **Reasoning Traces**: Path visualization
- **Loading Indicators**: Processing feedback

### Layout Components
- **Sidebar**: Navigation between views
- **Header**: Graph statistics and title
- **Responsive Design**: Adapts to screen sizes

## 🔍 Graph-RAG Pipeline

### Knowledge Extraction
```typescript
// Gemini prompt structure
const prompt = `
Extract a knowledge graph from the following text.
Represent entities as nodes and relationships as links.
Nodes should have 'id', 'label', 'type', and optionally 'description'.
Links should have 'source', 'target', and 'type'.

Text: "${text}"

Example JSON structure:
{
  "nodes": [
    {"id": "node1", "label": "Node Label 1", "type": "TypeA"},
    {"id": "node2", "label": "Node Label 2", "type": "TypeB"}
  ],
  "links": [
    {"source": "node1", "target": "node2", "type": "REL_TYPE"}
  ]
}
`;
```

### Query Processing
```typescript
// Graph-aware questioning
const prompt = `
Given the following knowledge graph:
"${graphRepresentation}"

Answer the following question based on the knowledge graph.
If the answer requires traversing nodes, include 'reasoningTrace'.

Question: "${query}"

Response format:
{
  "text": "Your answer based on the graph.",
  "reasoningTrace": ["nodeId1", "nodeId2"]
}
`;
```

## 🛠️ Development

### Running Tests
```bash
# Frontend tests
cd client
npm test

# Backend tests  
cd server
npm test
```

### Building for Production
```bash
# Frontend build
cd client
npm run build

# Backend build
cd server
npm run build
```

### Environment Variables
```env
# Backend .env
GOOGLE_API_KEY=your_gemini_api_key
PORT=3000
NODE_ENV=development
```

### Code Style
- **TypeScript**: Strict type checking enabled
- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting
- **Tailwind**: Utility-first CSS approach

## 🐛 Troubleshooting

### Common Issues

#### PDF Upload Not Working
- Check file size (max 10MB)
- Verify file is valid PDF format
- Ensure browser supports File API
- Check console for JavaScript errors

#### Graph Not Displaying
- Verify backend server is running
- Check API endpoints are accessible
- Ensure graph data exists in database
- Look for D3.js console errors

#### AI Responses Not Working
- Verify Gemini API key is valid
- Check API quota limits
- Ensure network connectivity
- Review server logs for errors

#### Styling Issues
- Verify Tailwind CSS is building
- Check PostCSS configuration
- Ensure CSS files are loading
- Clear browser cache

### Debug Mode
```bash
# Enable verbose logging
DEBUG=* npm run dev

# Check network requests
# Use browser DevTools → Network tab
```

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request
5. Code review and merge

### Guidelines
- Follow TypeScript best practices
- Write meaningful commit messages
- Update documentation for changes
- Test thoroughly before submission

### Feature Ideas
- [ ] Vector embeddings for semantic search
- [ ] Multi-modal PDF processing (images, tables)
- [ ] Graph export formats (JSON, CSV, GraphML)
- [ ] Collaborative graph editing
- [ ] Advanced graph algorithms
- [ ] Real-time collaboration

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Google Gemini API** - AI-powered text analysis
- **D3.js** - Interactive data visualization
- **PDF.js** - PDF text extraction
- **React & TypeScript** - Modern web development
- **TailwindCSS** - Utility-first CSS framework

---

**Built with ❤️ for research literature analysis**
