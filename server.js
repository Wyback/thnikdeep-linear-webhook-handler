const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const https = require("https");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(bodyParser.json());

app.post("/webhook", async (req, res) => {
  const payload = req.body;

  // Check if the Linear ticket status changed to 'in_progress'
  if (payload.action === "in_progress") {
    const issueId = payload.id;
    const issueTitle = payload.title.replace(/\s+/g, "-");
    const branchName = `issue-${issueId}-${issueTitle}`;

    try {
      // Create a new branch in GitLab
      const response = await axios.post(
        `https://gitlab.com/api/v4/projects/${process.env.GITLAB_PROJECT_ID}/repository/branches`,
        {
          branch: branchName,
          ref: "develop", // Replace 'develop' with your default branch name if different
        },
        {
          headers: {
            "Private-Token": process.env.GITLAB_TOKEN,
          },
        }
      );

      console.log("Branch created successfully:", response.data);
      res.status(200).send("Branch created successfully");
    } catch (error) {
      console.error("Error creating branch:", error);
      res.status(500).send("Failed to create branch");
    }
  } else {
    res.status(200).send("No action required");
  }
});

const HTTPS_PORT = 443;

// Read SSL certificate and key
const options = {
  key: fs.readFileSync(path.join(__dirname, "./server.key")),
  cert: fs.readFileSync(path.join(__dirname, "./server.crt")),
};

// Create HTTPS server
https.createServer(options, app).listen(HTTPS_PORT, () => {
  console.log(`HTTPS Server is running on port ${HTTPS_PORT}`);
});
