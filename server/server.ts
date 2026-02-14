
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

if (!GOOGLE_API_KEY) {
  console.error("GOOGLE_API_KEY is not set in the environment variables.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

app.use(cors());
app.use(express.json());

// Path to store the graph data
const GRAPH_DB_PATH = path.join(__dirname, 'graph_db.json');

// Helper to read/write graph data
interface GraphData {
  nodes: any[];
  links: any[];
}

const readGraphData = async (): Promise<GraphData> => {
  try {
    const data = await fs.readFile(GRAPH_DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { nodes: [], links: [] }; // Return empty graph if file doesn't exist
    }
    throw error;
  }
};

const writeGraphData = async (data: GraphData): Promise<void> => {
  await fs.writeFile(GRAPH_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
};

// API Endpoints
app.get('/api/graph', async (req, res) => {
  try {
    const graphData = await readGraphData();
    res.json(graphData);
  } catch (error) {
    console.error("Failed to read graph data:", error);
    res.status(500).json({ message: "Failed to retrieve graph data" });
  }
});

app.post('/api/graph/extract', async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ message: "Text content is required for extraction." });
  }

  try {
    // Placeholder for actual Gemini interaction
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `Extract a knowledge graph from the following text.
    Represent entities as nodes and relationships as links.
    Nodes should have 'id', 'label', 'type', and optionally 'description'.
    Links should have 'source', 'target', and 'type'.
    Return a JSON object with 'nodes' and 'links' arrays.

    Text: """
    ${text}
    """

    Example JSON structure:
    {
      "nodes": [
        {"id": "node1", "label": "Node Label 1", "type": "TypeA"},
        {"id": "node2", "label": "Node Label 2", "type": "TypeB", "description": "Description of node 2"}
      ],
      "links": [
        {"source": "node1", "target": "node2", "type": "REL_TYPE"}
      ]
    }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const rawContent = response.text();

    // Attempt to parse content, handle markdown code blocks
    let parsedGraph;
    try {
        if (rawContent.startsWith("```json") && rawContent.endsWith("```")) {
            parsedGraph = JSON.parse(rawContent.substring(7, rawContent.length - 3).trim());
        } else {
            parsedGraph = JSON.parse(rawContent);
        }
    } catch (parseError) {
        console.error("Failed to parse Gemini response as JSON:", parseError);
        console.error("Raw Gemini response:", rawContent);
        return res.status(500).json({ message: "Failed to parse Gemini response for graph extraction." });
    }

    const currentGraph = await readGraphData();
    const existingNodeIds = new Set(currentGraph.nodes.map(n => n.id));
    const newNodes = parsedGraph.nodes.filter((n: any) => !existingNodeIds.has(n.id));

    const updatedGraph = {
      nodes: [...currentGraph.nodes, ...newNodes],
      links: [...currentGraph.links, ...parsedGraph.links]
    };

    await writeGraphData(updatedGraph);
    res.json(updatedGraph);

  } catch (error) {
    console.error("Error during graph extraction:", error);
    res.status(500).json({ message: "Error processing text for knowledge graph extraction." });
  }
});

app.post('/api/graph/query', async (req, res) => {
  const { query, graph } = req.body; // 'graph' here would be the current graph data from client
  if (!query) {
    return res.status(400).json({ message: "Query text is required." });
  }
  if (!graph) {
    return res.status(400).json({ message: "Graph data is required for querying." });
  }

  try {
    // This part would involve more sophisticated graph traversal and RAG
    // For now, we'll send the query and the graph structure to Gemini.
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Construct a prompt that includes the graph data for RAG
    const graphRepresentation = JSON.stringify(graph, null, 2);
    const prompt = `Given the following knowledge graph:
    """
    ${graphRepresentation}
    """

    Answer the following question based on the knowledge graph.
    If the answer requires traversing nodes, please include the 'reasoningTrace' with IDs of traversed nodes in your JSON response.

    Question: "${query}"

    Respond in JSON format like this:
    {
      "text": "Your answer based on the graph.",
      "reasoningTrace": ["nodeId1", "nodeId2"] // Optional, only if traversal was needed
    }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const rawContent = response.text();

    let parsedResponse;
    try {
        if (rawContent.startsWith("```json") && rawContent.endsWith("```")) {
            parsedResponse = JSON.parse(rawContent.substring(7, rawContent.length - 3).trim());
        } else {
            parsedResponse = JSON.parse(rawContent);
        }
    } catch (parseError) {
        console.error("Failed to parse Gemini response for query as JSON:", parseError);
        console.error("Raw Gemini query response:", rawContent);
        return res.status(500).json({ message: "Failed to parse Gemini response for graph query." });
    }

    res.json(parsedResponse);

  } catch (error) {
    console.error("Error during graph query:", error);
    res.status(500).json({ message: "Error querying knowledge graph." });
  }
});

app.post('/api/graph/clear', async (req, res) => {
  try {
    await writeGraphData({ nodes: [], links: [] });
    res.status(200).json({ message: "Graph data cleared successfully." });
  } catch (error) {
    console.error("Error clearing graph data:", error);
    res.status(500).json({ message: "Failed to clear graph data." });
  }
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
