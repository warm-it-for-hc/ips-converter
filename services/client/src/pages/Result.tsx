import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";

const Result = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state?.result;

  useEffect(() => {
    if (!result) {
      navigate("/upload");
    }
  }, [result, navigate]);

  if (!result) return null;

  return (
    <div>
      <h2>Converted Result</h2>
      <pre>{JSON.stringify(result, null, 2)}</pre>
    </div>
  );
};

export default Result;