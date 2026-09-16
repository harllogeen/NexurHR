const login = async () => {
  try {
    const response = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "newadminuser@gmail.com",
        password: "password123",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Login Failed:", response.status, errorText);
    } else {
      const data = await response.json();
      console.log("Login Successful:", data);
    }
  } catch (error) {
    console.error("Network Error:", error.message);
  }
};

login();
