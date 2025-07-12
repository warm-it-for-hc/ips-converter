import { useState } from "react";
import { UploadIcon, FileText, AlertCircle, CheckCircle, Trash2, Binoculars, X, QrCode } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Upload: React.FC = () => {
  const [jsonContent, setJsonContent] = useState<object | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [inputKey, setInputKey] = useState<number>(Date.now());

  const navigate = useNavigate();

  const handleFile = (file: File) => {
    if (!file.type.includes("json") && !file.name.endsWith(".json")) {
      setError("Only JSON files are supported.");
      setJsonContent(null);
      setFileName(null);
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        setJsonContent(parsed);
        setError(null);
      } catch {
        setError("JSON parsing error.");
        setJsonContent(null);
      }
    };
    reader.readAsText(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleReset = () => {
    setJsonContent(null);
    setError(null);
    setFileName(null);
    setInputKey(Date.now());
  };

  const handlePreview = () => setShowPreviewModal(true);

  const handleConvert = async () => {
    if (!jsonContent) return;
    const res = await fetch("/api/v1/convert/ips", {
      method: "POST",
      body: JSON.stringify({ data: jsonContent }),
      headers: { "Content-Type": "application/json" },
    });
    const result = await res.json();
    navigate("/result", { state: { result } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Upload Card */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-xl">
                <UploadIcon className="h-5 w-5 text-blue-600" />
                Upload File
              </CardTitle>
              {jsonContent && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{fileName}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={handleReset} variant="outline" size="icon"
                        className="text-slate-600 hover:text-slate-800 bg-transparent cursor-pointer">
                        <Trash2 />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete file</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={handlePreview} variant="outline" size="icon"
                        className="text-slate-600 hover:text-slate-800 bg-transparent cursor-pointer">
                        <Binoculars />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Content Preview</TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                isDragOver ? "border-blue-400 bg-blue-50" : "border-slate-300 hover:border-slate-400"
              } ${jsonContent ? "border-green-400 bg-green-50" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                key={inputKey}
                type="file"
                name="file"
                accept=".json"
                onChange={handleChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />

              <div className="space-y-4">
                {jsonContent ? (
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                ) : (
                  <FileText className="h-12 w-12 text-slate-400 mx-auto" />
                )}
                <div>
                  <p className="text-lg font-medium text-slate-700">
                    {jsonContent ? "File uploaded successfully!" : "Drop your JSON file here"}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">click to browse files</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {jsonContent && (
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <QrCode className="h-5 w-5 text-blue-600" />
                Create QR Code
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-600">
                Upload a FHIR-based JSON to generate a QR code for easy sharing.
              </p>
              <Button
                onClick={handleConvert}
                className="bg-blue-100 text-blue-700 hover:bg-blue-500 hover:text-white transition-colors duration-200 cursor-pointer"
              >
                Convert!
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Error Alert */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700 font-medium">{error}</AlertDescription>
          </Alert>
        )}
      </div>

      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 overflow-clip">
            <div className="flex justify-between items-center border-b px-4 py-3">
              <h3 className="text-lg font-semibold text-slate-800">JSON Preview</h3>
              <Button
                onClick={() => setShowPreviewModal(false)}
                variant="outline"
                size="icon"
                className="text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X />
              </Button>
            </div>
            <div className="p-4 max-h-[70vh] overflow-auto bg-slate-900">
              <pre className="text-sm text-green-400 font-mono leading-relaxed">
                {JSON.stringify(jsonContent, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Upload;