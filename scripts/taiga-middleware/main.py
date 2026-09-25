import os
import re
import requests
from fastapi import FastAPI, Request, HTTPException

app = FastAPI(title="Taiga to GitHub BDD Bridge")

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_REPO_FRONTEND = os.getenv("GITHUB_REPO_FRONTEND")
GITHUB_REPO_BACKEND = os.getenv("GITHUB_REPO_BACKEND")

@app.post("/taiga-webhook")
async def taiga_webhook(request: Request):
    payload = await request.json()
    
    # We only care about userstory creation or changes
    if payload.get("type") != "userstory":
        return {"status": "ignored", "reason": "Not a user story"}
        
    action = payload.get("action")
    if action not in ["test", "create", "change"]:
        return {"status": "ignored", "reason": f"Unhandled action {action}"}

    data = payload.get("data", {})
    description = data.get("description", "")
    subject = data.get("subject", "")
    
    # Generate a safe filename slug from the subject
    slug = re.sub(r'[^a-z0-9]+', '-', subject.lower()).strip('-')
    if not slug:
        slug = f"story-{data.get('id')}"

    # Extract Gherkin (looking for Feature: block)
    gherkin_match = re.search(r'(Feature:.*?(?:\n\n|\Z))', description, re.DOTALL)
    gherkin_content = gherkin_match.group(1).strip() if gherkin_match else ""

    # Extract Mermaid diagram
    mermaid_match = re.search(r'```mermaid\n(.*?)\n```', description, re.DOTALL)
    mermaid_content = mermaid_match.group(1).strip() if mermaid_match else ""

    if not gherkin_content:
        return {"status": "ignored", "reason": "No Gherkin feature block found in description"}

    # Determine tag (frontend vs backend)
    tags = [t[0].lower() for t in data.get("tags", [])]
    tag = "frontend" if "frontend" in tags else "backend"

    # Select target repository
    target_repo = GITHUB_REPO_FRONTEND if tag == "frontend" else GITHUB_REPO_BACKEND

    # Send to GitHub Actions
    if not GITHUB_TOKEN or not target_repo:
        raise HTTPException(status_code=500, detail=f"GitHub credentials or repository not configured for {tag}")

    headers = {
        "Accept": "application/vnd.github.v3+json",
        "Authorization": f"token {GITHUB_TOKEN}"
    }
    
    dispatch_payload = {
        "event_type": "taiga_story_update",
        "client_payload": {
            "story_slug": slug,
            "tag": tag,
            "gherkin_content": gherkin_content,
            "mermaid_content": mermaid_content
        }
    }

    github_url = f"https://api.github.com/repos/{target_repo}/dispatches"
    response = requests.post(github_url, json=dispatch_payload, headers=headers)
    
    if response.status_code != 204:
        raise HTTPException(status_code=response.status_code, detail=response.text)

    return {"status": "success", "dispatched_to": target_repo, "slug": slug}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
