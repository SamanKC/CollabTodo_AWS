import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { exchangeCodeForTokens } from "../lib/auth";

export default function LoginCallback() {
  const navigate = useNavigate();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      exchangeCodeForTokens(code)
        .then((tokens) => {
          sessionStorage.setItem("id_token", tokens.id_token);
          sessionStorage.setItem("access_token", tokens.access_token);
          navigate("/");
        })
        .catch((e) => console.error(e));
    }
  }, [navigate]);
  return <p>Signing in...</p>;
}
