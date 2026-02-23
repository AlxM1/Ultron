#!/bin/bash
# AgentSmith Workflow Upload Script
# Uploads workflow definitions to AgentSmith backend

set -e

API_URL="http://localhost:4000"
WORKFLOWS_DIR="./workflows"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "AgentSmith Workflow Upload"
echo "========================================="
echo ""

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is required but not installed.${NC}"
    echo "Install with: sudo apt-get install jq"
    exit 1
fi

# Function to login and get token
get_auth_token() {
    echo -e "${YELLOW}Authenticating...${NC}"
    
    # Try to login (you'll need to create an admin user first)
    # For now, we'll check if we can access the API
    HEALTH_CHECK=$(curl -s "${API_URL}/health/live")
    
    if [[ $HEALTH_CHECK != *"alive"* ]]; then
        echo -e "${RED}Error: AgentSmith backend is not responding${NC}"
        echo "Check if the service is running: docker ps | grep agentsmith"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Backend is accessible${NC}"
    
    # You need to create an admin user and login first
    # This is a placeholder - replace with actual credentials
    echo ""
    echo -e "${YELLOW}Note: You need to authenticate first.${NC}"
    echo "1. Create an admin user:"
    echo "   curl -X POST ${API_URL}/api/v1/auth/register \\"
    echo "     -H 'Content-Type: application/json' \\"
    echo "     -d '{\"email\":\"admin@local\",\"password\":\"yourpassword\",\"name\":\"Admin\"}'"
    echo ""
    echo "2. Login to get a token:"
    echo "   curl -X POST ${API_URL}/api/v1/auth/login \\"
    echo "     -H 'Content-Type: application/json' \\"
    echo "     -d '{\"email\":\"admin@local\",\"password\":\"yourpassword\"}'"
    echo ""
    echo "3. Export the token:"
    echo "   export AGENTSMITH_TOKEN='your-jwt-token-here'"
    echo ""
    
    # Check if token is set
    if [ -z "$AGENTSMITH_TOKEN" ]; then
        echo -e "${RED}Error: AGENTSMITH_TOKEN environment variable not set${NC}"
        echo "Please set it with: export AGENTSMITH_TOKEN='your-token'"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Token found${NC}"
}

# Function to upload a workflow
upload_workflow() {
    local workflow_file=$1
    local workflow_name=$(basename "$workflow_file" .json)
    
    echo ""
    echo -e "${YELLOW}Uploading: ${workflow_name}${NC}"
    
    # Read the workflow JSON
    WORKFLOW_JSON=$(cat "$workflow_file")
    
    # Upload the workflow
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -X POST "${API_URL}/api/v1/workflows" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${AGENTSMITH_TOKEN}" \
        -d "$WORKFLOW_JSON")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)
    
    if [ "$HTTP_CODE" -eq 201 ] || [ "$HTTP_CODE" -eq 200 ]; then
        WORKFLOW_ID=$(echo "$BODY" | jq -r '.data.id')
        echo -e "${GREEN}✓ Uploaded successfully${NC}"
        echo -e "  Workflow ID: ${WORKFLOW_ID}"
        echo -e "  File: ${workflow_file}"
        
        # Ask if user wants to activate it
        if [ "$AUTO_ACTIVATE" = "yes" ]; then
            activate_workflow "$WORKFLOW_ID" "$workflow_name"
        fi
    else
        echo -e "${RED}✗ Upload failed (HTTP $HTTP_CODE)${NC}"
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    fi
}

# Function to activate a workflow
activate_workflow() {
    local workflow_id=$1
    local workflow_name=$2
    
    echo -e "${YELLOW}  Activating ${workflow_name}...${NC}"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -X POST "${API_URL}/api/v1/workflows/${workflow_id}/activate" \
        -H "Authorization: Bearer ${AGENTSMITH_TOKEN}")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)
    
    if [ "$HTTP_CODE" -eq 200 ]; then
        echo -e "${GREEN}  ✓ Activated${NC}"
    else
        echo -e "${RED}  ✗ Activation failed (HTTP $HTTP_CODE)${NC}"
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    fi
}

# Main script
echo "Checking prerequisites..."
get_auth_token

# Ask about auto-activation
echo ""
read -p "Auto-activate workflows after upload? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    AUTO_ACTIVATE="yes"
else
    AUTO_ACTIVATE="no"
fi

# Upload each workflow
if [ -d "$WORKFLOWS_DIR" ]; then
    for workflow_file in "$WORKFLOWS_DIR"/*.json; do
        if [ -f "$workflow_file" ]; then
            upload_workflow "$workflow_file"
        fi
    done
else
    echo -e "${RED}Error: Workflows directory not found: $WORKFLOWS_DIR${NC}"
    exit 1
fi

echo ""
echo "========================================="
echo -e "${GREEN}Upload complete!${NC}"
echo "========================================="
echo ""
echo "View your workflows:"
echo "  Admin UI: http://localhost:3001"
echo "  API: curl -H 'Authorization: Bearer \$AGENTSMITH_TOKEN' ${API_URL}/api/v1/workflows"
echo ""
