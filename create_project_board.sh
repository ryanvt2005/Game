#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# One-paste script: Create a GitHub Projects (Projects v2) board
# and auto-add your backlog issues to it, setting Status=Backlog.
#
# Prereqs:
#   - gh CLI installed and authenticated (gh auth login)
#   - Run from inside your repo folder OR set REPO=owner/repo
#
# Usage:
#   bash ./create_project_board.sh
#   REPO="owner/repo" bash ./create_project_board.sh
#
# Notes:
#   - Uses GraphQL API for Projects v2.
#   - Creates a Project titled "Fracture: Ascension - MVP Board" by default.
#   - Creates a SINGLE_SELECT field named "Status" with options:
#       Backlog, Ready, In Progress, Review, Done
#   - Adds issues by exact title match and sets Status=Backlog.
# ============================================================

# --- Sanity checks ---
gh auth status >/dev/null 2>&1 || { echo "ERROR: gh not authenticated. Run: gh auth login"; exit 1; }

REPO="${REPO:-$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)}"
if [[ -z "${REPO}" ]]; then
  echo "ERROR: Could not determine repo. Either cd into a git repo connected to GitHub, or set REPO=owner/repo"
  exit 1
fi

OWNER="${REPO%%/*}"
REPO_NAME="${REPO##*/}"
PROJECT_TITLE="${PROJECT_TITLE:-Fracture: Ascension - MVP Board}"

echo "Target repo: ${REPO}"
echo "Project title: ${PROJECT_TITLE}"

# --- GraphQL helper ---
gql() {
  gh api graphql -f query="$1" "${@:2}"
}

# --- Get repository + owner IDs (Projects v2 owner must be user/org) ---
read -r REPO_ID OWNER_ID OWNER_TYPE <<EOF
$(gql '
query($owner:String!, $name:String!) {
  repository(owner:$owner, name:$name) {
    id
    owner {
      __typename
      ... on Organization { id }
      ... on User { id }
    }
  }
}
' -f owner="$OWNER" -f name="$REPO_NAME" --jq '.data.repository.id, .data.repository.owner.id, .data.repository.owner.__typename' | tr '\n' ' ')
EOF

if [[ -z "${REPO_ID}" || -z "${OWNER_ID}" ]]; then
  echo "ERROR: Could not resolve repo/owner IDs. Check permissions and that REPO exists."
  exit 1
fi

echo "Owner type: ${OWNER_TYPE}"

# --- Create (or reuse) ProjectV2 under owner ---
PROJECT_ID="$(gql '
query($ownerId:ID!) {
  node(id:$ownerId) {
    ... on User { projectsV2(first:50) { nodes { id title } } }
    ... on Organization { projectsV2(first:50) { nodes { id title } } }
  }
}
' -f ownerId="$OWNER_ID" --jq '
  (.data.node.projectsV2.nodes // [])
  | map(select(.title=="'"$PROJECT_TITLE"'"))
  | .[0].id // ""
')"

if [[ -n "$PROJECT_ID" ]]; then
  echo "Project already exists. Reusing: ${PROJECT_ID}"
else
  PROJECT_ID="$(gql '
mutation($ownerId:ID!, $title:String!) {
  createProjectV2(input:{ownerId:$ownerId, title:$title}) {
    projectV2 { id title }
  }
}
' -f ownerId="$OWNER_ID" -f title="$PROJECT_TITLE" --jq '.data.createProjectV2.projectV2.id')"
  echo "Created project: ${PROJECT_ID}"
fi

# --- Create (or reuse) a SINGLE_SELECT field named "Status" with desired options ---
STATUS_FIELD_ID="$(gql '
query($projectId:ID!) {
  node(id:$projectId) {
    ... on ProjectV2 {
      fields(first:50) {
        nodes {
          __typename
          ... on ProjectV2Field { id name dataType }
          ... on ProjectV2SingleSelectField { id name dataType options { id name } }
        }
      }
    }
  }
}
' -f projectId="$PROJECT_ID" --jq '
  .data.node.fields.nodes[]
  | select(.name=="Status")
  | .id
' | head -n 1 || true)"

# Create field if missing or not single-select with our options
if [[ -z "$STATUS_FIELD_ID" ]]; then
  echo "Creating Status field..."
  STATUS_FIELD_ID="$(gql '
mutation($projectId:ID!) {
  createProjectV2Field(input:{
    projectId:$projectId,
    name:"Status",
    dataType:SINGLE_SELECT,
    singleSelectOptions:[
      {name:"Backlog"},
      {name:"Ready"},
      {name:"In Progress"},
      {name:"Review"},
      {name:"Done"}
    ]
  }) {
    projectV2Field {
      ... on ProjectV2SingleSelectField { id name options { id name } }
    }
  }
}
' -f projectId="$PROJECT_ID" --jq '.data.createProjectV2Field.projectV2Field.id')"
else
  echo "Found existing Status field: ${STATUS_FIELD_ID}"
fi

# --- Resolve Backlog option ID ---
BACKLOG_OPTION_ID="$(gql '
query($projectId:ID!) {
  node(id:$projectId) {
    ... on ProjectV2 {
      field(name:"Status") {
        ... on ProjectV2SingleSelectField { id options { id name } }
      }
      fields(first:50) {
        nodes {
          ... on ProjectV2SingleSelectField { id name options { id name } }
        }
      }
    }
  }
}
' -f projectId="$PROJECT_ID" --jq '
  (
    .data.node.field.options // (
      .data.node.fields.nodes[]? | select(.name=="Status") | .options
    )
  )
  | (map(select(.name=="Backlog"))[0].id // map(select(.name=="Todo"))[0].id // .[0].id)
')"

if [[ -z "$BACKLOG_OPTION_ID" ]]; then
  echo "ERROR: Could not resolve a Status option for Backlog/Todo."
  exit 1
fi

# --- Titles to add (must match existing issue titles exactly) ---
ISSUE_TITLES=(
  "[DOCS] Establish core game documentation baseline"
  "[TECH] Implement third-person camera with collision avoidance"
  "[TECH] Implement player movement (run, jump, dash)"
  "[TECH] Implement core combat system (damage, stagger, hit reactions)"
  "[TECH] Implement data-driven ability system"
  "[FEAT] Implement playable hero: Aegis Vector"
  "[FEAT] Implement playable hero: Riftcaller"
  "[FEAT] Implement playable hero: Kinetic Saint"
  "[TECH] Implement standard enemy archetypes"
  "[FEAT] Implement Vanguard hero enforcer enemies"
  "[FEAT] Implement corrupted hero boss framework"
  "[TECH] Implement mission structure and objective system"
  "[FEAT] Implement Act I story missions"
  "[TECH] Enforce web performance budgets"
  "[FEAT] Add VFX and audio polish to combat"
)

# --- Fetch open issues (ids + titles) for matching ---
# If you have more than 200 issues, increase 'first:200' and/or add pagination.
ISSUES_TSV="$(gql '
query($owner:String!, $name:String!) {
  repository(owner:$owner, name:$name) {
    issues(first:100, states:OPEN, orderBy:{field:CREATED_AT, direction:ASC}) {
      nodes { id title number }
    }
  }
}
' -f owner="$OWNER" -f name="$REPO_NAME" --jq '.data.repository.issues.nodes[] | [.id, .title] | @tsv')"

# Build a quick lookup map: title -> node id
declare -A ISSUE_ID_BY_TITLE
while IFS=$'\t' read -r iid ititle; do
  ISSUE_ID_BY_TITLE["$ititle"]="$iid"
done < <(printf '%s\n' "$ISSUES_TSV")

# --- Add issues to project and set Status=Backlog ---
added=0
skipped=0
missing=0

for title in "${ISSUE_TITLES[@]}"; do
  ISSUE_NODE_ID="${ISSUE_ID_BY_TITLE[$title]:-}"
  if [[ -z "$ISSUE_NODE_ID" ]]; then
    echo "MISSING (no open issue with exact title): $title"
    missing=$((missing+1))
    continue
  fi

  # Add item to project
  # If already added, GitHub returns an error; we handle gracefully.
  set +e
  ITEM_ID="$(gql '
mutation($projectId:ID!, $contentId:ID!) {
  addProjectV2ItemById(input:{projectId:$projectId, contentId:$contentId}) {
    item { id }
  }
}
' -f projectId="$PROJECT_ID" -f contentId="$ISSUE_NODE_ID" --jq '.data.addProjectV2ItemById.item.id' 2>/dev/null)"
  rc=$?
  set -e

  if [[ $rc -ne 0 || -z "$ITEM_ID" || "$ITEM_ID" == "null" ]]; then
    echo "SKIP (likely already on project): $title"
    skipped=$((skipped+1))
    continue
  fi

  # Set Status field to Backlog
  gql '
mutation($projectId:ID!, $itemId:ID!, $fieldId:ID!, $optionId:String!) {
  updateProjectV2ItemFieldValue(input:{
    projectId:$projectId,
    itemId:$itemId,
    fieldId:$fieldId,
    value:{ singleSelectOptionId:$optionId }
  }) {
    projectV2Item { id }
  }
}
' -f projectId="$PROJECT_ID" -f itemId="$ITEM_ID" -f fieldId="$STATUS_FIELD_ID" -f optionId="$BACKLOG_OPTION_ID" >/dev/null

  echo "ADDED: $title"
  added=$((added+1))
done

echo ""
echo "✅ Project setup complete."
echo "Project: ${PROJECT_TITLE}"
echo "Repo: ${REPO}"
echo "Added: ${added} | Skipped: ${skipped} | Missing: ${missing}"
echo ""
echo "Open your project here:"
echo "  gh project view --owner \"${OWNER}\" --web \"${PROJECT_TITLE}\" 2>/dev/null || true"
echo "If the command above doesn’t open it, go to GitHub → Projects under the repo owner and open: ${PROJECT_TITLE}"
