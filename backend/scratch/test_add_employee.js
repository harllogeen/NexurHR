const addEmployee = async () => {
  const employeeData = {
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com", // CHANGE THIS to test 'already exists' error
    department: "Engineering",
    role: "Software Engineer",
    systemRole: "employee",
    status: "Active",
    employmentStatus: "Full-time",
    salary: 5000,
    emergencyContact: {
      name: "Jane Doe",
      relationship: "Spouse",
      phone: "123-456-7890"
    }
  };

  try {
    console.log("Sending request to http://localhost:3000/api/employees...");
    const response = await fetch("http://localhost:3000/api/employees", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(employeeData),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`Error ${response.status}:`, data.message || data);
    } else {
      console.log("Success:", data.message);
      console.log("Credentials:", data.credentials);
    }
  } catch (error) {
    console.error("Network Error:", error.message);
  }
};

addEmployee();
