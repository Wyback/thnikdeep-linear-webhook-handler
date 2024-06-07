const express = require("express");
require("dotenv").config();
const bodyParser = require("body-parser");
const axios = require("axios");
const https = require("https");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(bodyParser.json());

app.post("/webhook", async (req, res) => {
  const payload = req.body;

  if (payload.type === "IssueHistory") {
    const issueId = payload.data.id;

    // Debugging logs
    console.log("Received webhook payload:", JSON.stringify(payload, null, 2));
    console.log("Issue ID:", issueId);
    console.log("LINEAR_API_KEY:", process.env.LINEAR_API_KEY);
    console.log("GITLAB_TOKEN:", process.env.GITLAB_TOKEN);

    if (!process.env.LINEAR_API_KEY) {
      return res
        .status(500)
        .send("Internal server error: LINEAR_API_KEY is not defined");
    }

    try {
      // Fetch issue details from Linear
      const linearResponse = await axios.post(
        "https://api.linear.app/graphql",
        {
          query: `
            query {
              issue(id: "${issueId}") {
                id
                title
              }
            }
          `,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.LINEAR_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const issue = linearResponse.data.data.issue;
      console.log(issue.title);
      const issueTitle = issue.title.replace(/\s+/g, "-");
      const branchName = `issue-${issueId}-${issueTitle}`;

      try {
        // Create a new branch in GitLab
        const response = await axios.post(
          `https://gitlab.com/api/v4/projects/thinkdeep-ai%2Fmeshstream%2Fapps%2Fneutronis/repository/branches`,
          {
            branch: branchName,
            ref: "develop",
          },
          {
            headers: {
              "Content-Type": "application/json",
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
    } catch (error) {
      console.error("Error :", error);
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
