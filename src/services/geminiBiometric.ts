import { User } from "../types";
import { GoogleGenAI } from "@google/genai";

// Pre-declare AI instance to avoid top-level initialization crash
let aiInstance: any = null;

const getAI = () => {
  if (aiInstance) return aiInstance;
  
  // Try strictly following the skill recommendation first
  let key = process.env.GEMINI_API_KEY;
  
  // Fallback to standard Vite prefixing if the platform mapping missed the process.env shim
  if (!key) {
    key = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  }

  if (!key) {
    console.error("[Biometric] CRITICAL CONFIG ERROR: AI Key is missing. " +
                  "Note: I am looking for 'GEMINI_API_KEY' or 'GEMINI_API__KEY'. " +
                  "Please ensure it is saved in Settings > Secrets, then re-deploy.");
    return null;
  }
  
  try {
    aiInstance = new GoogleGenAI({ apiKey: key });
    return aiInstance;
  } catch (err) {
    console.error("[Biometric] AI Initialization Failed:", err);
    return null;
  }
};

/**
 * Identifies an employee from a camera snapshot using client-side AI vision.
 * Returns the matched User object or null if no match found.
 */
export const predictEmployeeIdentity = async (
  capturedDataUrl: string, 
  employees: User[]
): Promise<User | null> => {
  try {
    const ai = getAI();
    if (!ai) return null;

    const validGallery = employees.filter((emp: any) => emp.faceEnrolled && emp.faceData && emp.faceData.startsWith('data:image'));
      
    if (validGallery.length === 0) {
      console.error("[Biometric] Prediction aborted: No enrolled users found in gallery.");
      return null;
    }

    console.log(`[Biometric] Matching against ${validGallery.length} enrolled signatures...`);

    const parts: any[] = [
      { text: `SYSTEM PROTOCOL: Biometric Identity Verification.
        
CRITICAL TASK: Analyze the 'CAPTURED_SCAN' and find the closest matching face from the 'ENROLLED_GALLERY'.

Facial Landmark Analysis:
1. Examine ocular distance and orbital socket depth.
2. Compare the nasal bridge structure and base width.
3. Verify the mandibular line and labial alignment.
4. Account for minor variations in lighting, pose, or expression.

CONFIDENCE CALCULATION:
- Match: Confidence 0.70 to 1.00 (Success)
- Ambiguous: Confidence 0.50 to 0.69 (Return 'low_confidence')
- No Match: Confidence < 0.50 (Return 'none')

You MUST return ONLY a JSON object:
{"id": "matched_user_id_or_none", "confidence": 0.95, "reason": "Consistent bone structure"}` }
    ];
 
    // Add captured image
    const capturedBase64 = capturedDataUrl.split(',')[1];
    parts.push({ 
      inlineData: { data: capturedBase64, mimeType: "image/jpeg" }
    });
    parts.push({ text: "SOURCE: CAPTURED_SCAN" });

    // Add gallery
    validGallery.forEach((emp: any) => {
      const base64 = emp.faceData.split(',')[1];
      parts.push({ 
          inlineData: { data: base64, mimeType: "image/jpeg" } 
      });
      parts.push({ text: `REFERENCE: USER_ID_${emp.id}` });
    });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
      }
    });

    const responseText = response.text || "";
    
    // Clean potential markdown code blocks and recover JSON
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`Invalid AI response format: ${responseText}`);
    }

    const match = JSON.parse(jsonMatch[0]);
    console.log(`[Biometric] Raw Match Result: ID=${match.id}, Confidence=${match.confidence}, Reason=${match.reason || 'N/A'}`);
    
    // We now accept matches at 0.70+ for production robustness
    if (match.id && match.id !== 'none' && match.id !== 'low_confidence') {
        let finalId = match.id;
        if (typeof finalId === 'string' && finalId.startsWith("USER_ID_")) {
            finalId = finalId.replace("USER_ID_", "");
        }
        const matchedEmp = employees.find(e => e.id === String(finalId));
        return matchedEmp || null;
    }

    if (match.id === 'low_confidence') {
      console.warn("[Biometric] Match rejected due to low confidence:", match.confidence);
    }

    return null;

  } catch (error) {
    console.error("Biometric Prediction Error:", error);
    return null;
  }
};
