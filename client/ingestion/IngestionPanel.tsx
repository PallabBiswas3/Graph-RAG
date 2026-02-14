import React, { useState, useRef } from "react";
import { Loader2, Plus, FileText, Upload } from "lucide-react";
import { extractTextFromPDF, validatePDFFile } from "../services/pdfService";

interface Props {
  loading: boolean;
  onSubmit: (text: string) => void;
}

const IngestionPanel: React.FC<Props> = ({ loading, onSubmit }) => {
  const [text, setText] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!validatePDFFile(file)) {
      alert('Please upload a valid PDF file (max 10MB)');
      return;
    }

    setPdfLoading(true);
    try {
      const extractedText = await extractTextFromPDF(file);
      setText(extractedText);
    } catch (error) {
      alert('Failed to extract text from PDF. Please try again.');
      console.error(error);
    } finally {
      setPdfLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit(text);
      setText("");
    }
  };

  return (
    <div className="flex-1 flex flex-col p-8 max-w-4xl mx-auto w-full">
      {/* PDF Upload Section */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2 text-gray-300">
            <FileText size={20} />
            <span className="font-medium">Upload Research Paper (PDF)</span>
          </div>
          <span className="text-xs text-gray-500">or paste text below</span>
        </div>

        <div className="flex gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            disabled={loading || pdfLoading}
            className="hidden"
            id="pdf-upload"
          />

          <label
            htmlFor="pdf-upload"
            className={`px-4 py-2 border border-blue-600/30 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer flex items-center gap-2 ${loading || pdfLoading
                ? 'opacity-50 cursor-not-allowed'
                : 'text-blue-400 hover:bg-blue-600/10 hover:border-blue-500'
              }`}
          >
            {pdfLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Upload size={16} />
            )}
            {pdfLoading ? 'Extracting...' : 'Choose PDF'}
          </label>
        </div>

        {pdfLoading && (
          <div className="mt-2 text-xs text-blue-400 animate-pulse">
            Extracting text from PDF...
          </div>
        )}
      </div>

      {/* Text Input Section */}
      <div className="flex-1 flex flex-col">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste research text here or upload a PDF above..."
          className="flex-1 bg-gray-800 border border-blue-800/30 rounded-xl p-5 resize-none outline-none text-gray-300 placeholder-gray-500 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all duration-200"
        />

        <button
          onClick={handleSubmit}
          disabled={loading || !text.trim()}
          className="mt-6 px-7 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white font-medium flex items-center justify-center gap-2 shadow-md transition-all duration-200"
        >
          {loading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Plus size={20} />
          )}
          Update Graph
        </button>
      </div>
    </div>
  );
};

export default IngestionPanel;