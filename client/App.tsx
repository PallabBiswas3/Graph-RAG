import React, { useEffect, useReducer, useCallback } from "react";
import Sidebar from "./layout/Sidebar";
import Header from "./layout/Header";
import GraphWorkspace from "./graph/GraphWorkspace";
import IngestionPanel from "./ingestion/IngestionPanel";
import ChatPanel from "./chat/ChatPanel";

import {
  extractKnowledgeGraph,
  queryGraphRAG,
  fetchGraphData,
  clearGraphData,
} from "./services/geminiService";

import { GraphData, Node, ChatMessage } from "./types";

/* =========================
   TYPES
========================= */

export type View = "input" | "graph" | "chat";

interface AppState {
  view: View;
  graph: GraphData;
  selectedNode: Node | null;
  messages: ChatMessage[];
  loading: {
    extract: boolean;
    rag: boolean;
  };
}

type Action =
  | { type: "SET_VIEW"; payload: View }
  | { type: "SET_GRAPH"; payload: GraphData }
  | { type: "SET_SELECTED_NODE"; payload: Node | null }
  | { type: "ADD_MESSAGE"; payload: ChatMessage }
  | { type: "CLEAR_MESSAGES" }
  | { type: "SET_LOADING"; payload: Partial<AppState["loading"]> };

/* =========================
   INITIAL STATE
========================= */

const initialState: AppState = {
  view: "input",
  graph: { nodes: [], links: [] },
  selectedNode: null,
  messages: [],
  loading: {
    extract: false,
    rag: false,
  },
};

/* =========================
   REDUCER
========================= */

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_VIEW":
      return { ...state, view: action.payload };

    case "SET_GRAPH":
      return { ...state, graph: action.payload };

    case "SET_SELECTED_NODE":
      return { ...state, selectedNode: action.payload };

    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.payload] };

    case "CLEAR_MESSAGES":
      return { ...state, messages: [] };

    case "SET_LOADING":
      return {
        ...state,
        loading: { ...state.loading, ...action.payload },
      };

    default:
      return state;
  }
}

/* =========================
   APP COMPONENT
========================= */

const App: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  /* Load graph on startup */
  useEffect(() => {
    const load = async () => {
      const graph = await fetchGraphData();
      dispatch({ type: "SET_GRAPH", payload: graph });
    };
    load();
  }, []);

  /* =========================
     HANDLERS
  ========================= */

  const handleViewChange = useCallback((view: View) => {
    dispatch({ type: "SET_VIEW", payload: view });
  }, []);

  const handleNodeSelect = useCallback((node: Node | null) => {
    dispatch({ type: "SET_SELECTED_NODE", payload: node });
  }, []);

  const handleExtract = useCallback(async (text: string) => {
    if (!text.trim()) return;

    dispatch({ type: "SET_LOADING", payload: { extract: true } });
    dispatch({ type: "SET_VIEW", payload: "graph" });

    try {
      const graph = await extractKnowledgeGraph(text);
      dispatch({ type: "SET_GRAPH", payload: graph });
    } finally {
      dispatch({ type: "SET_LOADING", payload: { extract: false } });
    }
  }, []);

  const handleQuery = useCallback(
    async (query: string) => {
      if (!query.trim()) return;

      dispatch({
        type: "ADD_MESSAGE",
        payload: { role: "user", content: query },
      });

      dispatch({ type: "SET_LOADING", payload: { rag: true } });

      try {
        const response = await queryGraphRAG(query, state.graph);
        dispatch({ type: "ADD_MESSAGE", payload: response });
      } catch {
        dispatch({
          type: "ADD_MESSAGE",
          payload: {
            role: "assistant",
            content: "Reasoning failure. Check graph consistency.",
          },
        });
      } finally {
        dispatch({ type: "SET_LOADING", payload: { rag: false } });
      }
    },
    [state.graph]
  );

  const handleClearGraph = useCallback(async () => {
    await clearGraphData();
    const empty = await fetchGraphData();

    dispatch({ type: "SET_GRAPH", payload: empty });
    dispatch({ type: "CLEAR_MESSAGES" });
    dispatch({ type: "SET_SELECTED_NODE", payload: null });
  }, []);

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="flex h-screen bg-gray-900 text-gray-200 antialiased">
      <Sidebar
        active={state.view}
        onChange={handleViewChange}
        onClear={handleClearGraph}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header graph={state.graph} loading={state.loading.extract} />

        <main className="flex-1 overflow-hidden rounded-tl-xl bg-gray-950 shadow-inner">
          <div className="h-full w-full overflow-y-auto">
            {state.view === "input" && (
              <IngestionPanel
                loading={state.loading.extract}
                onSubmit={handleExtract}
              />
            )}

            {state.view === "graph" && (
              <GraphWorkspace
                graph={state.graph}
                selectedNode={state.selectedNode}
                onSelect={handleNodeSelect}
              />
            )}

            {state.view === "chat" && (
              <ChatPanel
                messages={state.messages}
                loading={state.loading.rag}
                onSend={handleQuery}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;