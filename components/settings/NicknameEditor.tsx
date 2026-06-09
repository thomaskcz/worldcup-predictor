"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

type NicknameEditorState = "idle" | "loading" | "success" | "error";

export function NicknameEditor() {
  const { user } = useAuth();
  const [nickname, setNickname] = useState("");
  const [initialNickname, setInitialNickname] = useState("");
  const [state, setState] = useState<NicknameEditorState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Fetch current nickname
  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/user/nickname");
        const data = await response.json();

        if (data.success && data.profile) {
          setInitialNickname(data.profile.nickname ?? "");
          setNickname(data.profile.nickname ?? "");
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!nickname.trim()) {
        setErrorMessage("Nickname cannot be empty");
        setState("error");
        return;
      }

      setState("loading");
      setErrorMessage("");
      setSuccessMessage("");

      try {
        const response = await fetch("/api/user/nickname", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nickname: nickname.trim() }),
        });

        const data = await response.json();

        if (!response.ok) {
          setErrorMessage(data.error || "Failed to update nickname");
          setState("error");
          return;
        }

        if (data.success) {
          setInitialNickname(data.nickname);
          setSuccessMessage("Nickname updated successfully!");
          setState("success");

          // Clear success message after 3 seconds
          setTimeout(() => {
            setState("idle");
            setSuccessMessage("");
          }, 3000);
        } else {
          setErrorMessage(data.error || "Failed to update nickname");
          setState("error");
        }
      } catch (error) {
        console.error("Error updating nickname:", error);
        setErrorMessage("An error occurred. Please try again.");
        setState("error");
      }
    },
    [nickname]
  );

  const handleReset = () => {
    setNickname(initialNickname);
    setState("idle");
    setErrorMessage("");
    setSuccessMessage("");
  };

  const hasChanges = nickname !== initialNickname;

  return (
    <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Display Name
        </h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Set a unique nickname to display throughout the app instead of your email.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="nickname"
            className="block text-sm font-medium text-zinc-900 dark:text-zinc-100"
          >
            Nickname
          </label>
          <input
            id="nickname"
            type="text"
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              setState("idle");
              setErrorMessage("");
            }}
            placeholder="e.g., john-doe"
            disabled={state === "loading"}
            className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 disabled:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-400 dark:disabled:bg-zinc-700"
          />
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            3-20 characters, lowercase letters, numbers, underscores, and hyphens only
          </p>
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
            <p className="text-sm text-red-800 dark:text-red-200">
              {errorMessage}
            </p>
          </div>
        )}

        {successMessage && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950">
            <p className="text-sm text-green-800 dark:text-green-200">
              {successMessage}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={state === "loading" || !hasChanges}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700"
          >
            {state === "loading" ? "Saving..." : "Save Nickname"}
          </button>
          {hasChanges && (
            <button
              type="button"
              onClick={handleReset}
              disabled={state === "loading"}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 dark:disabled:bg-zinc-700"
            >
              Cancel
            </button>
          )}
        </div>

        {initialNickname && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800">
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Current nickname: <span className="font-semibold">{initialNickname}</span>
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
