interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

// Store token in memory
let authToken: string | null = null;
let tokenExpiry: number | null = null;

// Set auth token and store it
const setAuthToken = (tokenData: {
  access_token: string;
  expires_in: number;
}) => {
  authToken = tokenData.access_token;
  tokenExpiry = Date.now() + tokenData.expires_in * 1000;

  if (typeof window !== "undefined") {
    localStorage.setItem("authToken", authToken);
    localStorage.setItem("tokenExpiry", tokenExpiry.toString());
  }
};

// Clear auth data
const clearAuthToken = () => {
  authToken = null;
  tokenExpiry = null;

  if (typeof window !== "undefined") {
    localStorage.removeItem("authToken");
    localStorage.removeItem("tokenExpiry");
  }
};

// Get current token
const getToken = async (): Promise<string> => {
  // Return valid token if available
  if (authToken && tokenExpiry && Date.now() < tokenExpiry) {
    return authToken;
  }

  // Try to get from localStorage
  if (typeof window !== "undefined") {
    const storedToken = localStorage.getItem("authToken");
    const storedExpiry = localStorage.getItem("tokenExpiry");

    if (storedToken && storedExpiry && Date.now() < parseInt(storedExpiry)) {
      authToken = storedToken;
      tokenExpiry = parseInt(storedExpiry);
      return storedToken;
    }
  }

  // If token is expired or not found
  throw new Error("No valid token found");
};

// Set token directly (for development/testing)
const setTokenDirectly = (token: string) => {
  authToken = token;
  tokenExpiry = Date.now() + 3600 * 1000; // Set expiry to 1 hour from now

  if (typeof window !== "undefined") {
    localStorage.setItem("authToken", authToken);
    localStorage.setItem("tokenExpiry", tokenExpiry.toString());
  }
};

// Verify token
const verifyToken = async (token: string): Promise<boolean> => {
  try {
    // Use the same domain as in order.ts
    const response = await fetch(
      "https://openapi.ketshoptest.com/order/get/2506000042",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error(
        "Token verification failed:",
        response.status,
        response.statusText
      );
      clearAuthToken();
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error verifying token:", error);
    clearAuthToken();
    return false;
  }
};

const setupToken = async () => {
  const tokenData = {
    access_token:
      "eyJhbGciOiJFZERTQSIsImtpZCI6IjAxOTc2Nzg5LWNkODktNzYyZS1iMTM5LTFkZjIzZTUyYzQ3YiJ9.eyJjbGllbnRfaWQiOiIwMTk3Njc4OS1jZDg5LTc2MmUtYjEzOS0xZGYyM2U1MmM0N2IiLCJrZXRfd2ViX2lkIjoxMzE3LCJzY29wZXMiOlsiYWxsIl0sIm5hbWUiOiJJbnRlcm5zaGlwIiwiZG9tYWluIjoidWF0LmtldHNob3B0ZXN0LmNvbSIsInN1YiI6IjAxOTc2NzhiLTQ3YmUtNzA4YS04MTFkLWEwZWNiMDg1OTdiMCIsImlhdCI6MTc0OTc4ODg3MH0.OSbUayE_yS9IqOKLFrgsAGPJepiW7Otn3vzvE1SL9ijTpJmsGydGAP1_4AZA75cTmlXy583iS81EZxZszeYaBg",
    expires_in: 3600,
    token_type: "Bearer",
    client_id: "01976789-cd89-762e-b139-1df23e52c47b",
    scopes: ["all"],
  };

  try {
    console.log(
      "Token ที่ใช้:",
      tokenData.access_token.substring(0, 20) + "..."
    );
    console.log(
      "Token หมดอายุเมื่อ:",
      new Date(Date.now() + 3600 * 1000).toISOString()
    );

    setAuthToken(tokenData);
    console.log("ตั้งค่า Token เรียบร้อยแล้ว");
    const apiUrl = "https://openapi.ketshoptest.com/order/get/2506000042";
    console.log("URL ที่เรียก:", apiUrl);

    const testResponse = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      mode: "cors",
    }).catch((error) => {
      console.error("เกิดข้อผิดพลาดในการเรียก API:", error.message);
      console.error("Error name:", error.name);
      console.error("Error stack:", error.stack);
      throw error;
    });

    console.log(
      "สถานะการตอบกลับ:",
      testResponse.status,
      testResponse.statusText
    );

    if (!testResponse.ok) {
      const errorText = await testResponse
        .text()
        .catch(() => "ไม่สามารถอ่านข้อความผิดพลาดได้");
      console.error("ข้อผิดพลาดจากเซิร์ฟเวอร์:", errorText);
      console.error(
        "Headers:",
        Object.fromEntries(testResponse.headers.entries())
      );
      throw new Error(
        `ไม่สามารถดึงข้อมูลได้: ${testResponse.status} ${testResponse.statusText}`
      );
    }

    const orders = await testResponse.json().catch((e) => {
      console.error("Failed to parse JSON response:", e);
      throw new Error("Invalid JSON response from server");
    });

    console.log("Orders API response:", orders);
    return orders;
  } catch (error) {
    console.error("Error in setupToken:", error);
  }
};

if (typeof window !== "undefined") {
  setupToken();
}

const getAccessToken = async (): Promise<string> => {
  const token = await getToken();
  return token;
};

export {
  getToken,
  clearAuthToken,
  setTokenDirectly,
  verifyToken,
  getAccessToken,
};
