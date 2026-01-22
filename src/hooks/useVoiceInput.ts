import { useState, useCallback, useRef, useEffect } from "react";
import { useScribe, CommitStrategy } from "@elevenlabs/react";
import { supabase } from "@/integrations/supabase/client";

interface UseVoiceInputOptions {
  onTranscript?: (text: string) => void;
  onError?: (error: string) => void;
}

export function useVoiceInput({ onTranscript, onError }: UseVoiceInputOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const transcriptRef = useRef("");

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: CommitStrategy.VAD,
    onPartialTranscript: (data) => {
      const currentText = transcriptRef.current + (transcriptRef.current ? " " : "") + data.text;
      onTranscript?.(currentText);
    },
    onCommittedTranscript: (data) => {
      transcriptRef.current = transcriptRef.current + (transcriptRef.current ? " " : "") + data.text;
      onTranscript?.(transcriptRef.current);
    },
  });

  const startRecording = useCallback(async () => {
    setIsConnecting(true);
    transcriptRef.current = "";

    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionDenied(false);

      // Get token from edge function
      const { data, error } = await supabase.functions.invoke("elevenlabs-scribe-token");

      if (error || !data?.token) {
        throw new Error(error?.message || "Failed to get speech-to-text token");
      }

      // Connect to ElevenLabs
      await scribe.connect({
        token: data.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      setIsRecording(true);
    } catch (error: any) {
      console.error("Voice input error:", error);
      
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        setPermissionDenied(true);
        onError?.("Microphone access denied. Please enable microphone permissions.");
      } else {
        onError?.(error.message || "Failed to start voice input");
      }
    } finally {
      setIsConnecting(false);
    }
  }, [scribe, onError]);

  const stopRecording = useCallback(() => {
    scribe.disconnect();
    setIsRecording(false);
  }, [scribe]);

  const clearTranscript = useCallback(() => {
    transcriptRef.current = "";
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scribe.isConnected) {
        scribe.disconnect();
      }
    };
  }, [scribe]);

  return {
    isRecording,
    isConnecting,
    isConnected: scribe.isConnected,
    permissionDenied,
    partialTranscript: scribe.partialTranscript,
    committedTranscripts: scribe.committedTranscripts,
    startRecording,
    stopRecording,
    clearTranscript,
  };
}
