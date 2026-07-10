# Using AI with Superset

> Source: https://superset.apache.org/user-docs/using-superset/using-ai-with-superset/
>
> Note: This environment's network policy blocks direct downloads from
> superset.apache.org, so this document was reconstructed from the page via
> web search rather than fetched verbatim. Refer to the URL above for the
> canonical, up-to-date version.

## Overview

Superset supports AI assistants through the Model Context Protocol (MCP).
You can connect Claude, ChatGPT, or other MCP-compatible clients to explore
your data, build charts, create dashboards, and run SQL through natural
language.

## Requirements

- Superset 5.0+
- Your admin must enable and deploy the MCP server before you can connect.
  See the admin docs: MCP Server Deployment & Authentication
  (https://superset.apache.org/admin-docs/configuration/mcp-server/)

## Connecting your AI assistant

Once the MCP server is deployed, it is exposed at:

```
http://<host>:<port>/mcp
```

Add this endpoint to your MCP-compatible client (Claude, ChatGPT, Cursor,
etc.). For any internet-facing deployment, authentication must be enabled;
production deployments should use JWT-based authentication, where the MCP
server validates a Bearer token on every request.

## What you can do

### Browse and discover

- List the datasets you have access to, with filtering and search
- Get dataset details, including column names and types
- List charts and dashboards
- Get chart and dashboard details

### Create and edit charts

Describe the visualization you want and the AI creates it for you. Chart
creation uses a preview-first workflow:

1. **Explore** — the AI returns an Explore link so you can see the chart
   before it is saved.
2. **Iterate** — ask the AI to adjust the chart (chart type, metrics,
   grouping, filters) and preview again.
3. **Save** — ask the AI to save the chart once you're satisfied.

### Work with SQL

- Run SQL queries
- Open SQL Lab pre-populated with a query
- Save queries as reports

## Example prompts

- "What datasets are available?"
- "Show me the columns in the sales_orders dataset"
- "Create a bar chart of monthly revenue by region from the sales dataset"
- "Create a simple table chart called 'Sample Table' using dataset 12"
- "Change chart 42 to a bar chart grouped by country and using SUM(value)"

## Best practices

- **Be specific** — "Create a bar chart of monthly revenue by region from
  the sales dataset" works better than "Make me a chart".
- **Start with exploration** — ask what datasets and charts exist before
  creating new ones.
- **Review AI-generated content** — check chart configurations and SQL
  before saving.
- **Use Explore for refinement** — ask the AI for an Explore link, then
  fine-tune interactively in the Superset UI.
- **Check permissions if you get errors** — the AI can only see and do what
  your Superset user account is allowed to.

## Local installation

Run `scripts/setup-superset.sh` to install Superset (with the MCP server)
into a virtualenv, initialize the metadata DB and admin user, and start:

- Web UI: http://localhost:8088 (admin / admin by default)
- MCP endpoint: http://localhost:5008/mcp

## Related documentation

- MCP Server Deployment & Authentication (admin docs):
  https://superset.apache.org/admin-docs/configuration/mcp-server/
- MCP Integration (developer docs):
  https://superset.apache.org/developer-docs/extensions/mcp/
