import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

const Result = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state;

  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (!state) {
      navigate("/upload");
    } else {
      setResult(state.result);
    }
  }, [state, navigate]);

  if (!result) {
    return null;
  }

  return (
    <div>
      <p>{result.message}</p>
      <p>{result.created_at}</p>
      <pre>{JSON.stringify(result.data, null, 2)}</pre>
    </div>
  );
};

export default Result;