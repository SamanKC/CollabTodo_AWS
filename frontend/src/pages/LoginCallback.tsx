import { useEffect, useMemo, useState } from "react";
import { handleCallback } from "../lib/auth";

export default function LoginCallback() {
  const [status, setStatus] = useState<"working" | "ok" | "error">("working");
  const [msg, setMsg] = useState<string>("");

  // If Cognito sent an error in the URL, show it immediately (don't try token exchange)
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const urlError = urlParams.get("error");
  const urlErrorDesc = urlParams.get("error_description");

  useEffect(() => {
    (async () => {
      try {
        if (urlError) {
          setStatus("error");
          setMsg(`${urlError}: ${urlErrorDesc ?? "(no description)"}`);
          return;
        }
        await handleCallback();
        setStatus("ok");
        // Back to home
        window.location.replace("/");
      } catch (e: unknown) {
        setStatus("error");
        setMsg((e as Error).message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen grid place-items-center">
      <div className="p-6 rounded-lg shadow bg-white w-full max-w-md">
        <h1 className="text-xl font-semibold mb-2">Signing you in…</h1>

        {status === "working" && !urlError && <p>Completing OAuth flow…</p>}

        {status === "error" && (
          <div className="text-red-600">
            <p className="font-medium">Login failed.</p>
            <pre className="text-xs mt-2 whitespace-pre-wrap break-words">
              {msg}
            </pre>
          </div>
        )}
      </div>
    </div>
  );}
