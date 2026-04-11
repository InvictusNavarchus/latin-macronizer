import { GM_xmlhttpRequest } from "$";
import { API_CONFIG } from "./config";

interface MacronizerResponse {
  macronized_text: string;
}

interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

function validateApiResponse(data: unknown): ValidationResult {
  if (!data || typeof data !== "object") {
    return { isValid: false, error: "Response is not a valid object" };
  }

  if (!("macronized_text" in data)) {
    return { isValid: false, error: "Response missing required field: macronized_text" };
  }

  if (typeof (data as Record<string, unknown>)["macronized_text"] !== "string") {
    return { isValid: false, error: "macronized_text field is not a string" };
  }

  return { isValid: true, error: null };
}

export function macronizeText(text: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const { url, ...apiParams } = API_CONFIG;

    GM_xmlhttpRequest({
      method: "POST",
      url,
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({ text_to_macronize: text, ...apiParams }),
      onload(response) {
        try {
          if (response.status === 200) {
            const data: unknown = JSON.parse(response.responseText);

            const validation = validateApiResponse(data);
            if (!validation.isValid) {
              console.error("Macronizer: Invalid API response:", validation.error, data);
              reject(new Error(`Invalid API response: ${validation.error}`));
              return;
            }

            resolve((data as MacronizerResponse).macronized_text);
          } else {
            let errorMessage = `HTTP ${response.status}`;
            try {
              const errData = JSON.parse(response.responseText) as Record<string, unknown>;
              if (typeof errData["detail"] === "string") errorMessage = errData["detail"];
              else if (typeof errData["message"] === "string") errorMessage = errData["message"];
            } catch {
              // Keep the HTTP status message
            }
            reject(new Error(`API Error: ${errorMessage}`));
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("Macronizer: Failed to parse API response:", err);
          reject(new Error(`Failed to parse response: ${message}`));
        }
      },
      onerror() {
        reject(new Error("Network error occurred"));
      },
    });
  });
}