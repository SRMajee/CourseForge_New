#!/usr/bin/env bash
set -euo pipefail

root="server"

dirs=(
  "$root/src/ai/agents"
  "$root/src/ai/chains"
  "$root/src/ai/tools"
  "$root/src/ai/prompts"
  "$root/src/ai/parsers"
  "$root/src/config"
  "$root/src/controllers"
  "$root/src/middleware"
  "$root/src/models"
  "$root/src/routes"
  "$root/src/utils"
  "$root/src/types"
)

files=(
  "$root/src/ai/agents/courseAgent.ts"
  "$root/src/ai/chains/.gitkeep"
  "$root/src/ai/tools/youtubeTool.ts"
  "$root/src/ai/tools/ttsTool.ts"
  "$root/src/ai/prompts/templates.ts"
  "$root/src/ai/parsers/courseSchema.ts"
  "$root/src/config/db.ts"
  "$root/src/config/env.ts"
  "$root/src/config/auth0.ts"
  "$root/src/controllers/courseController.ts"
  "$root/src/controllers/authController.ts"
  "$root/src/middleware/authMiddleware.ts"
  "$root/src/middleware/errorMiddleware.ts"
  "$root/src/middleware/validation.ts"
  "$root/src/models/User.ts"
  "$root/src/models/Course.ts"
  "$root/src/routes/courseRoutes.ts"
  "$root/src/routes/index.ts"
  "$root/src/utils/logger.ts"
  "$root/src/utils/apiResponse.ts"
  "$root/src/types/express.d.ts"
  "$root/src/index.ts"
  "$root/.env.example"
  "$root/.gitignore"
  "$root/docker-compose.dev.yml"
  "$root/docker-compose.prod.yml"
  "$root/Dockerfile"
  "$root/nodemon.json"
  "$root/package.json"
  "$root/tsconfig.json"
  "$root/eslint.config.js"
)

for d in "${dirs[@]}"; do
  mkdir -p "$d"
done

for f in "${files[@]}"; do
  # Preserve existing files; create empty ones if missing
  if [[ ! -e "$f" ]]; then
    > "$f"
  fi
done

echo "Created structure under $root"
