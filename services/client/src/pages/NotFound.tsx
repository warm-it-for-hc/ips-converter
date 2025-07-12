import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

const NotFound: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="bg-white/80 backdrop-blur-sm shadow-lg rounded-2xl p-10 max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-700">Page Not Found</h1>
        <p className="text-slate-500">
          The page you’re looking for doesn’t exist or has been moved.
        </p>
        <Button
          onClick={() => navigate("/")}
          variant="outline"
          size="sm"
          className="text-slate-600 hover:text-slate-800 bg-transparent cursor-pointer"
        >
          Return home
        </Button>
      </div>
    </div>
  )
}

export default NotFound