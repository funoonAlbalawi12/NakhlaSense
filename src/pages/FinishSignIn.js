import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function FinishSignIn() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const dev = params.get("dev");

    if (dev === "true") {
      console.log("DEV LOGIN SUCCESS");
      navigate("/dashboard");
    }
  }, [location, navigate]);

  return <p>Signing you in (DEV MODE)...</p>;
}

export default FinishSignIn;
