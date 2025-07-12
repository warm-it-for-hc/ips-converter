import { useLocation, useNavigate } from "react-router-dom";
import React from "react";
import { QrCode, Link as LinkIcon, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const Share: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const joinCode = searchParams.get("joinCode");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              {joinCode ? (
                <QrCode className="h-5 w-5 text-blue-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              {joinCode ? "Share Code" : "Error"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {joinCode ? (
              <div className="flex flex-col items-center gap-6">
                <div className="bg-slate-900 rounded-lg px-8 py-6 shadow-inner border-2 border-blue-200 mb-2">
                  <span className="text-3xl font-mono tracking-widest text-blue-300 select-all">{joinCode}</span>
                </div>
                <div className="text-slate-700 text-center text-lg font-medium">
                  Welcome! Use this code to join or share your resource.
                </div>
                <Button
                  onClick={() => navigate("/")}
                  className="bg-blue-100 text-blue-700 hover:bg-blue-500 hover:text-white transition-colors duration-200 cursor-pointer mt-2"
                >
                  Go Home
                </Button>
              </div>
            ) : (
              <Alert className="border-red-200 bg-red-50 mt-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700 font-medium">
                  Sorry, we couldn't find your join code. Please try again or start over.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Share;