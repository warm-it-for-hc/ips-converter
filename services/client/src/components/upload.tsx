import type React from "react"
import { useEffect, useState } from "react"
import { UploadIcon, FileText, AlertCircle, CheckCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

const Upload: React.FC = () => {
  const [triggered, setTriggered] = useState<boolean>(false)
  const [jsonContent, setJsonContent] = useState<object | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState<boolean>(false)
  const [fileName, setFileName] = useState<string | null>(null)

  const handleFile = (file: File) => {
    if (!triggered) {
      return
    }

    if (!file.type.includes("json")) {
      setError("Only JSON files are supported.")
      return
    }

    setFileName(file.name) // 파일명 저장 추가

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string)
        setJsonContent(parsed)
        setError(null)
      } catch (e) {
        setError("JSON parsing error.")
      }
    }
    reader.readAsText(file)
  }

  useEffect(() => {
    const form = document.forms[0]
    if (!form) return

    const formData = new FormData(form)
    const file = formData.get("file") as File | null
    if (file) {
      setTriggered(true)
      handleFile(file)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setTriggered(true)
      handleFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      setTriggered(true)
      handleFile(files[0])
    }
  }

  const handleReset = () => {
    setJsonContent(null)
    setError(null)
    setFileName(null)
    setTriggered(false)
    // 파일 input 초기화
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ""
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800">JSON File Upload</h1>
          <p className="text-slate-600 text-lg">Upload and preview your JSON files with ease</p>
        </div>

        {/* Upload Card */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <UploadIcon className="h-5 w-5 text-blue-600" />
              Upload JSON File
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form method="POST" encType="multipart/form-data">
              <div
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                  isDragOver ? "border-blue-400 bg-blue-50" : "border-slate-300 hover:border-slate-400"
                } ${jsonContent ? "border-green-400 bg-green-50" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
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
                    <p className="text-sm text-slate-500 mt-1">or click to browse files</p>
                  </div>

                  <div className="text-xs text-slate-400">Supports: .json files only</div>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700 font-medium">{error}</AlertDescription>
          </Alert>
        )}

        {/* JSON Content Display */}
        {jsonContent ? (
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <FileText className="h-5 w-5 text-green-600" />
                  JSON Content Preview
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{fileName}</span>
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    size="sm"
                    className="text-slate-600 hover:text-slate-800 bg-transparent"
                  >
                    Upload New File
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-900 rounded-lg p-4 overflow-auto max-h-96">
                <pre className="text-sm text-green-400 font-mono leading-relaxed">
                  {JSON.stringify(jsonContent, null, 2)}
                </pre>
              </div>
              <div className="mt-4 flex justify-center">
                <Button onClick={handleReset} variant="secondary" className="w-full sm:w-auto">
                  <UploadIcon className="h-4 w-4 mr-2" />
                  Upload Another File
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          !error && (
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">No file selected yet</p>
                <p className="text-slate-400 text-sm mt-2">Upload a JSON file to see its content here</p>
              </CardContent>
            </Card>
          )
        )}
      </div>
    </div>
  )
}

export default Upload
